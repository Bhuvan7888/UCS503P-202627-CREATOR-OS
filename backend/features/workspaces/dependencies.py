"""Request-time workspace scoping: every /workspaces/{workspace}/... route resolves the caller's
membership here (other features' routers use it the same way)."""

from dataclasses import dataclass
from uuid import UUID

from fastapi import Depends

from features.auth.dependencies import get_current_user_id
from features.creators.supabase_repository import SupabaseCreatorRepo
from features.workspaces.models import MyWorkspace
from features.workspaces.service import WorkspaceService
from features.workspaces.supabase_repository import SupabaseWorkspaceRepo
from shared.errors import NotFoundError, PermissionDeniedError
from shared.http_errors import map_errors
from shared.supabase_client import get_supabase_client


@dataclass(frozen=True)
class WorkspaceContext:
    user_id: UUID
    workspace: MyWorkspace


def get_workspace_service() -> WorkspaceService:
    client = get_supabase_client(service_role=True)
    return WorkspaceService(SupabaseWorkspaceRepo(client), SupabaseCreatorRepo(client))


async def require_workspace_member(
    workspace: str,
    user_id: UUID = Depends(get_current_user_id),
    service: WorkspaceService = Depends(get_workspace_service),
) -> WorkspaceContext:
    """`workspace` is the path segment: a slug (ws-xxxxxxxx) or the workspace id."""
    with map_errors({NotFoundError: 404, PermissionDeniedError: 403}):
        return WorkspaceContext(user_id, await service.get_for_member(workspace, user_id))
