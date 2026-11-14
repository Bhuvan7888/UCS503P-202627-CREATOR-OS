from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends

from features.approvals.models import PublishRequest, PublishRequestCreate, RejectRequest
from features.approvals.service import ApprovalService
from features.approvals.supabase_repository import SupabasePublishRequestRepo
from features.content.router import get_content_service
from features.content.service import ContentService
from features.integrations.dependencies import emit_event
from features.integrations.rules import REQUEST_PUBLISH
from features.notifications.dependencies import notify
from features.workspaces.dependencies import (
    WorkspaceContext,
    require_permission,
)
from shared.errors import ConflictError, NotFoundError
from shared.http_errors import map_errors
from shared.supabase_client import get_supabase_client

router = APIRouter(prefix="/workspaces/{workspace}/approvals", tags=["approvals"])
_ERRORS: dict[type[Exception], int] = {NotFoundError: 404, ConflictError: 409}


async def _tell_requester(
    background: BackgroundTasks,
    ctx: WorkspaceContext,
    service: ApprovalService,
    req: PublishRequest,
) -> None:
    """The person who asked hears the decision (agents get it by webhook)."""
    if req.source != "human" or req.requested_by in (None, ctx.user_id):
        return
    title = (await service.content.get(ctx.workspace.id, req.content_item_id)).title
    verdict = (
        "approved — it's marked Published"
        if req.status == "approved"
        else f"rejected: {req.reason}"
    )
    notify(
        background,
        ctx.workspace.id,
        [req.requested_by],
        "publishing_updates",
        f"“{title}” was {'approved' if req.status == 'approved' else 'rejected'}",
        f"Your publish request was {verdict}.",
        f"/dashboard/{ctx.workspace.slug}/kanban?item={req.content_item_id}",
    )


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
    owner = ctx.workspace.owner_user_id
    if (
        ctx.api_key or owner != ctx.user_id
    ):  # the owner decides; don't tell them about their own request
        title = (await service.content.get(ctx.workspace.id, req.content_item_id)).title
        who = ctx.api_key or "A teammate"
        notify(
            background,
            ctx.workspace.id,
            [owner],
            "publishing_updates",
            f"“{title}” is waiting for approval",
            f"{who} asked to publish it.",
            f"/dashboard/{ctx.workspace.slug}/approvals",
            priority="high",
        )
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
    await _tell_requester(background, ctx, service, req)
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
    await _tell_requester(background, ctx, service, req)
    return req
