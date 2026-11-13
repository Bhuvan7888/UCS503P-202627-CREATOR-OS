from uuid import UUID

from fastapi import APIRouter, Depends

from features.auth.dependencies import get_current_user_id
from features.workspaces.dependencies import (
    WorkspaceContext,
    get_workspace_service,
    require_workspace_member,
)
from features.workspaces.models import MemberOut, MyWorkspace, WorkspaceCreateRequest
from features.workspaces.service import WorkspaceService
from shared.errors import ValidationError
from shared.http_errors import map_errors

router = APIRouter(prefix="/workspaces", tags=["workspaces"])


@router.get("", response_model=list[MyWorkspace])
async def list_my_workspaces(
    user_id: UUID = Depends(get_current_user_id),
    service: WorkspaceService = Depends(get_workspace_service),
):
    return await service.list_for_user(user_id)


@router.post("", response_model=MyWorkspace, status_code=201)
async def create_workspace(
    request: WorkspaceCreateRequest,
    user_id: UUID = Depends(get_current_user_id),
    service: WorkspaceService = Depends(get_workspace_service),
):
    with map_errors({ValidationError: 400}):
        return await service.create_workspace(user_id, request.name)


@router.get("/{workspace}", response_model=MyWorkspace)
async def get_workspace(ctx: WorkspaceContext = Depends(require_workspace_member)):
    return ctx.workspace


@router.get("/{workspace}/members", response_model=list[MemberOut])
async def list_members(
    ctx: WorkspaceContext = Depends(require_workspace_member),
    service: WorkspaceService = Depends(get_workspace_service),
):
    return await service.list_members(ctx.workspace.id)
