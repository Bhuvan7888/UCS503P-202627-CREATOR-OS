from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, Response

from features.auth.dependencies import get_current_user_id
from features.notifications.dependencies import notify
from features.workspaces.dependencies import (
    WorkspaceContext,
    get_team_service,
    get_workspace_service,
    require_permission,
    require_workspace_member,
)
from features.workspaces.models import (
    AuditEntry,
    Invite,
    InviteCreate,
    InviteCreated,
    InvitePreview,
    MemberOut,
    MemberRole,
    MemberRoleUpdate,
    MyWorkspace,
    RolePermissions,
    RolePermissionsUpdate,
    Workspace,
    WorkspaceCreateRequest,
    WorkspaceRename,
)
from features.workspaces.service import TeamService, WorkspaceService
from shared.errors import ConflictError, NotFoundError, PermissionDeniedError, ValidationError
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
async def get_workspace(
    background: BackgroundTasks,
    ctx: WorkspaceContext = Depends(require_workspace_member),
    team: TeamService = Depends(get_team_service),
):
    """The workspace shell calls this on load, which is what "Opened the workspace" records (after the response)."""
    if team.should_record_open(ctx.workspace, ctx.user_id):
        background.add_task(team.record_open, ctx.workspace, ctx.user_id)
    return ctx.workspace


@router.get("/{workspace}/members", response_model=list[MemberOut])
async def list_members(
    ctx: WorkspaceContext = Depends(require_workspace_member),
    service: WorkspaceService = Depends(get_workspace_service),
):
    return await service.list_members(ctx.workspace.id)


_TEAM_ERRORS: dict[type[Exception], int] = {
    NotFoundError: 404,
    PermissionDeniedError: 403,
    ConflictError: 409,
    ValidationError: 400,
}


@router.patch("/{workspace}", response_model=MyWorkspace)
async def rename_workspace(
    request: WorkspaceRename,
    ctx: WorkspaceContext = Depends(require_permission("manage_workspace")),
    team: TeamService = Depends(get_team_service),
):
    return await team.rename(ctx.workspace, ctx.user_id, request.name)


@router.patch("/{workspace}/members/{user_id}", status_code=204)
async def change_member_role(
    user_id: UUID,
    request: MemberRoleUpdate,
    ctx: WorkspaceContext = Depends(require_workspace_member),
    team: TeamService = Depends(get_team_service),
):
    with map_errors(_TEAM_ERRORS):
        await team.change_role(ctx.workspace, ctx.user_id, user_id, request.role)
    return Response(status_code=204)


@router.delete("/{workspace}/members/{user_id}", status_code=204)
async def remove_member(
    user_id: UUID,
    ctx: WorkspaceContext = Depends(require_workspace_member),
    team: TeamService = Depends(get_team_service),
):
    with map_errors(_TEAM_ERRORS):
        await team.remove_member(ctx.workspace, ctx.user_id, user_id)
    return Response(status_code=204)


@router.get("/{workspace}/invites", response_model=list[Invite])
async def list_invites(
    ctx: WorkspaceContext = Depends(require_permission("invite_members")),
    team: TeamService = Depends(get_team_service),
):
    return await team.invites(ctx.workspace)


@router.post("/{workspace}/invites", response_model=InviteCreated, status_code=201)
async def invite_member(
    request: InviteCreate,
    ctx: WorkspaceContext = Depends(require_permission("invite_members")),
    team: TeamService = Depends(get_team_service),
):
    with map_errors(_TEAM_ERRORS):
        return await team.invite(ctx.workspace, ctx.user_id, request.email, request.role)


@router.delete("/{workspace}/invites/{invite_id}", status_code=204)
async def revoke_invite(
    invite_id: UUID,
    ctx: WorkspaceContext = Depends(require_permission("invite_members")),
    team: TeamService = Depends(get_team_service),
):
    with map_errors(_TEAM_ERRORS):
        await team.revoke_invite(ctx.workspace, ctx.user_id, invite_id)
    return Response(status_code=204)


@router.get("/{workspace}/roles", response_model=list[RolePermissions])
async def list_roles(
    ctx: WorkspaceContext = Depends(require_permission("view_settings")),
    team: TeamService = Depends(get_team_service),
):
    return await team.roles(ctx.workspace)


@router.put("/{workspace}/roles/{role}", response_model=list[RolePermissions])
async def set_role_permissions(
    role: MemberRole,
    request: RolePermissionsUpdate,
    ctx: WorkspaceContext = Depends(require_workspace_member),
    team: TeamService = Depends(get_team_service),
):
    with map_errors(_TEAM_ERRORS):
        return await team.set_role_permissions(
            ctx.workspace, ctx.user_id, role, request.permissions
        )


@router.get("/{workspace}/audit-log", response_model=list[AuditEntry])
async def audit_log(
    ctx: WorkspaceContext = Depends(require_permission("manage_workspace")),
    team: TeamService = Depends(get_team_service),
):
    return await team.audit_log(ctx.workspace)


invites_router = APIRouter(prefix="/invites", tags=["workspaces"])


@invites_router.get("/{token}", response_model=InvitePreview)
async def preview_invite(
    token: str,
    _user: UUID = Depends(get_current_user_id),
    team: TeamService = Depends(get_team_service),
):
    with map_errors(_TEAM_ERRORS):
        return await team.preview_invite(token)


@invites_router.post("/{token}/accept", response_model=Workspace)
async def accept_invite(
    background: BackgroundTasks,
    token: str,
    user_id: UUID = Depends(get_current_user_id),
    team: TeamService = Depends(get_team_service),
):
    with map_errors(_TEAM_ERRORS):
        ws = await team.accept_invite(token, user_id)
    name, _ = (await team.user_directory.describe([user_id])).get(user_id, ("Someone", None))
    notify(
        background,
        ws.id,
        [ws.owner_user_id],
        "workspace_activity",
        f"{name} joined {ws.name}",
        "They accepted your invitation.",
        f"/dashboard/{ws.slug}/settings/workspace",
    )
    return ws
