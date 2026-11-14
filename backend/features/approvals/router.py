from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends

from features.approvals.models import PublishRequest, PublishRequestCreate, RejectRequest
from features.approvals.service import ApprovalService
from features.approvals.supabase_repository import SupabasePublishRequestRepo
from features.content.router import get_content_service
from features.content.service import ContentService
from features.integrations.dependencies import emit_event
from features.integrations.rules import REQUEST_PUBLISH
from features.workspaces.dependencies import (
    WorkspaceContext,
    require_permission,
)
from shared.errors import ConflictError, NotFoundError
from shared.http_errors import map_errors
from shared.supabase_client import get_supabase_client

router = APIRouter(prefix="/workspaces/{workspace}/approvals", tags=["approvals"])
_ERRORS: dict[type[Exception], int] = {NotFoundError: 404, ConflictError: 409}


def _event(req: PublishRequest) -> dict:
    return req.model_dump(
        mode="json", include={"id", "content_item_id", "source", "agent_name", "status", "reason"}
    )


def get_approval_service(
    content: ContentService = Depends(get_content_service),
) -> ApprovalService:
    return ApprovalService(
        SupabasePublishRequestRepo(get_supabase_client(service_role=True)), content
    )


@router.get("", response_model=list[PublishRequest])
async def list_requests(
    ctx: WorkspaceContext = Depends(require_permission("view_schedule")),
    service: ApprovalService = Depends(get_approval_service),
):
    return await service.list(ctx.workspace.id)


@router.post("", response_model=PublishRequest, status_code=201)
async def request_publish(
    background: BackgroundTasks,
    body: PublishRequestCreate,
    ctx: WorkspaceContext = Depends(
        require_permission("create_content", "edit_scripts", REQUEST_PUBLISH)
    ),
    service: ApprovalService = Depends(get_approval_service),
):
    with map_errors(_ERRORS):
        req = await service.request(ctx.workspace.id, ctx.user_id, body, agent_name=ctx.api_key)
    await emit_event(background, ctx.workspace.id, "publish.pending_approval", _event(req))
    return req


@router.post("/{request_id}/approve", response_model=PublishRequest)
async def approve(
    background: BackgroundTasks,
    request_id: UUID,
    ctx: WorkspaceContext = Depends(require_permission("manage_workspace")),
    service: ApprovalService = Depends(get_approval_service),
):
    with map_errors(_ERRORS):
        req = await service.approve(ctx.workspace.id, request_id, ctx.user_id)
    await emit_event(background, ctx.workspace.id, "publish.approved", _event(req))
    return req


@router.post("/{request_id}/reject", response_model=PublishRequest)
async def reject(
    background: BackgroundTasks,
    request_id: UUID,
    body: RejectRequest,
    ctx: WorkspaceContext = Depends(require_permission("manage_workspace")),
    service: ApprovalService = Depends(get_approval_service),
):
    with map_errors(_ERRORS):
        req = await service.reject(ctx.workspace.id, request_id, ctx.user_id, body.reason)
    await emit_event(background, ctx.workspace.id, "publish.rejected", _event(req))
    return req
