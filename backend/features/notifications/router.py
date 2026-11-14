from uuid import UUID

from fastapi import APIRouter, Depends, Response

from features.notifications.dependencies import get_notification_service
from features.notifications.models import MarkRead, Notification, UnreadCount
from features.notifications.service import NotificationService
from features.workspaces.dependencies import WorkspaceContext, require_person
from shared.errors import NotFoundError
from shared.http_errors import map_errors

router = APIRouter(prefix="/workspaces/{workspace}/notifications", tags=["notifications"])


@router.get("", response_model=list[Notification])
async def inbox(
    archived: bool = False,
    ctx: WorkspaceContext = Depends(require_person),
    svc: NotificationService = Depends(get_notification_service),
):
    return await svc.inbox(ctx.workspace.id, ctx.user_id, archived)


@router.get("/unread-count", response_model=UnreadCount)
async def unread_count(
    ctx: WorkspaceContext = Depends(require_person),
    svc: NotificationService = Depends(get_notification_service),
):
    return UnreadCount(unread=await svc.unread(ctx.workspace.id, ctx.user_id))


@router.post("/read", status_code=204)
async def mark_read(
    request: MarkRead,
    ctx: WorkspaceContext = Depends(require_person),
    svc: NotificationService = Depends(get_notification_service),
):
    await svc.mark_read(ctx.workspace.id, ctx.user_id, request.ids)
    return Response(status_code=204)


@router.post("/{notification_id}/archive", status_code=204)
async def archive(
    notification_id: UUID,
    ctx: WorkspaceContext = Depends(require_person),
    svc: NotificationService = Depends(get_notification_service),
):
    with map_errors({NotFoundError: 404}):
        await svc.archive(ctx.workspace.id, ctx.user_id, notification_id)
    return Response(status_code=204)
