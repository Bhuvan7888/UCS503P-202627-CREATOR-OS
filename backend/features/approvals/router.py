from uuid import UUID

from fastapi import APIRouter, Depends

from features.approvals.models import PublishRequest, PublishRequestCreate, RejectRequest
from features.approvals.service import ApprovalService
from features.approvals.supabase_repository import SupabasePublishRequestRepo
from features.content.router import get_content_service
from features.content.service import ContentService
from features.workspaces.dependencies import WorkspaceContext, require_workspace_member
from shared.errors import ConflictError, NotFoundError
from shared.http_errors import map_errors
from shared.supabase_client import get_supabase_client

router = APIRouter(prefix="/workspaces/{workspace}/approvals", tags=["approvals"])
_ERRORS: dict[type[Exception], int] = {NotFoundError: 404, ConflictError: 409}


def get_approval_service(
    content: ContentService = Depends(get_content_service),
) -> ApprovalService:
    return ApprovalService(
        SupabasePublishRequestRepo(get_supabase_client(service_role=True)), content
    )


@router.get("", response_model=list[PublishRequest])
async def list_requests(
    ctx: WorkspaceContext = Depends(require_workspace_member),
    service: ApprovalService = Depends(get_approval_service),
):
    return await service.list(ctx.workspace.id)


@router.post("", response_model=PublishRequest, status_code=201)
async def request_publish(
    body: PublishRequestCreate,
    ctx: WorkspaceContext = Depends(require_workspace_member),
    service: ApprovalService = Depends(get_approval_service),
):
    with map_errors(_ERRORS):
        return await service.request(ctx.workspace.id, ctx.user_id, body)


@router.post("/{request_id}/approve", response_model=PublishRequest)
async def approve(
    request_id: UUID,
    ctx: WorkspaceContext = Depends(require_workspace_member),
    service: ApprovalService = Depends(get_approval_service),
):
    with map_errors(_ERRORS):
        return await service.approve(ctx.workspace.id, request_id, ctx.user_id)


@router.post("/{request_id}/reject", response_model=PublishRequest)
async def reject(
    request_id: UUID,
    body: RejectRequest,
    ctx: WorkspaceContext = Depends(require_workspace_member),
    service: ApprovalService = Depends(get_approval_service),
):
    with map_errors(_ERRORS):
        return await service.reject(ctx.workspace.id, request_id, ctx.user_id, body.reason)
