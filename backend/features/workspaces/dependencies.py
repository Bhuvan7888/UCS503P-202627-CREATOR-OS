"""Request-time workspace scoping: every /workspaces/{workspace}/... route resolves the caller's
membership here, and `require_permission` checks what the caller's role may do (other features'
routers use these the same way)."""

from collections.abc import Awaitable, Callable
from dataclasses import dataclass
from uuid import UUID

from fastapi import Depends, Header, HTTPException, Request

from features.auth.dependencies import get_current_user_id
from features.creators.supabase_repository import SupabaseCreatorRepo
from features.demo_mode import is_demo_mode
from features.integrations.dependencies import get_integrations_service
from features.integrations.rules import is_api_key, permissions_for_scopes
from features.integrations.service import IntegrationsService
from features.workspaces.models import MyWorkspace
from features.workspaces.service import TeamService, WorkspaceService
from features.workspaces.supabase_repository import (
    SupabaseAuditRepo,
    SupabaseTeamRepo,
    SupabaseUserDirectory,
    SupabaseWorkspaceRepo,
)
from shared.config import settings
from shared.email.resend_adapter import ResendAdapter
from shared.errors import NotFoundError, PermissionDeniedError
from shared.http_errors import map_errors
from shared.supabase_client import get_supabase_client


@dataclass(frozen=True)
class WorkspaceContext:
    # for an API key: the person who issued it (the key acts on their behalf)
    user_id: UUID
    workspace: MyWorkspace
    api_key: str | None = None

    @property
    def actor_label(self) -> str | None:
        return f"API key · {self.api_key}" if self.api_key else None


def get_workspace_service() -> WorkspaceService:
    client = get_supabase_client(service_role=True)
    return WorkspaceService(
        SupabaseWorkspaceRepo(client),
        SupabaseCreatorRepo(client),
        SupabaseUserDirectory(client),
        SupabaseTeamRepo(client),
    )


def get_team_service() -> TeamService:
    client = get_supabase_client(service_role=True)
    key = settings.TRANSACTIONAL_EMAIL_API_KEY
    # never email from the offline demo dataset (tests and demo mode use made-up addresses)
    email = None if is_demo_mode() or not key or "dummy" in key.lower() else ResendAdapter()
    return TeamService(
        SupabaseWorkspaceRepo(client),
        SupabaseTeamRepo(client),
        SupabaseAuditRepo(client),
        SupabaseUserDirectory(client),
        email,
        settings.APP_URL,
    )


async def require_workspace_member(
    workspace: str,
    request: Request,
    authorization: str | None = Header(default=None),
    service: WorkspaceService = Depends(get_workspace_service),
    integrations: IntegrationsService = Depends(get_integrations_service),
    team: TeamService = Depends(get_team_service),
) -> WorkspaceContext:
    """`workspace` is the path segment: a slug (ws-xxxxxxxx) or the workspace id.

    The bearer is a person's session, or an API key ("cos_…") which acts only in its own workspace with
    the permissions its scopes grant; every key call is written to the audit log under the key's name.
    """
    token = (authorization or "").removeprefix("Bearer ").strip()
    if is_api_key(token):
        key = await integrations.resolve_key(token)
        if key is None or key.created_by is None:
            raise HTTPException(status_code=401, detail="Invalid or revoked API key")
        with map_errors({NotFoundError: 404}):
            ws = await service.resolve(workspace)
        if ws.id != key.workspace_id:
            raise HTTPException(status_code=403, detail="This API key belongs to another workspace")
        mine = MyWorkspace(
            **ws.model_dump(), role="agent", permissions=permissions_for_scopes(key.scopes)
        )
        ctx = WorkspaceContext(key.created_by, mine, api_key=key.name)
        await team.record(
            mine,
            key.created_by,
            f"{request.method} {request.url.path}",
            "API",
            label=ctx.actor_label,
        )
        return ctx
    user_id = await get_current_user_id(authorization)
    with map_errors({NotFoundError: 404, PermissionDeniedError: 403}):
        return WorkspaceContext(user_id, await service.get_for_member(workspace, user_id))


def require_permission(*any_of: str) -> Callable[..., Awaitable[WorkspaceContext]]:
    """A member whose role has at least one of `any_of`. Refusals are written to the audit log."""

    async def check(
        ctx: WorkspaceContext = Depends(require_workspace_member),
        team: TeamService = Depends(get_team_service),
    ) -> WorkspaceContext:
        if not set(any_of) & set(ctx.workspace.permissions):
            await team.record(
                ctx.workspace,
                ctx.user_id,
                "Was refused",
                " or ".join(any_of).replace("_", " "),
                "denied",
                label=ctx.actor_label,
            )
            raise HTTPException(status_code=403, detail="Your role doesn't allow this")
        return ctx

    return check


def require_human(*any_of: str) -> Callable[..., Awaitable[WorkspaceContext]]:
    """Like require_permission, but never satisfied by an API key (e.g. managing keys themselves)."""
    permitted = require_permission(*any_of)

    async def check(ctx: WorkspaceContext = Depends(permitted)) -> WorkspaceContext:
        if ctx.api_key:
            raise HTTPException(
                status_code=403, detail="API keys can't do this; a signed-in person must"
            )
        return ctx

    return check
