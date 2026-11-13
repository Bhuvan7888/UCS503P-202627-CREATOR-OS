"""Request-time workspace scoping: every /workspaces/{workspace}/... route resolves the caller's
membership here, and `require_permission` checks what the caller's role may do (other features'
routers use these the same way)."""

from collections.abc import Awaitable, Callable
from dataclasses import dataclass
from uuid import UUID

from fastapi import Depends, HTTPException

from features.auth.dependencies import get_current_user_id
from features.creators.supabase_repository import SupabaseCreatorRepo
from features.demo_mode import is_demo_mode
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
    user_id: UUID
    workspace: MyWorkspace


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
    user_id: UUID = Depends(get_current_user_id),
    service: WorkspaceService = Depends(get_workspace_service),
) -> WorkspaceContext:
    """`workspace` is the path segment: a slug (ws-xxxxxxxx) or the workspace id."""
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
            )
            raise HTTPException(status_code=403, detail="Your role doesn't allow this")
        return ctx

    return check
