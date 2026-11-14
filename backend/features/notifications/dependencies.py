"""Wiring for notifications, and `notify` for routers that create them after an action."""

import logging
from uuid import UUID

from fastapi import BackgroundTasks

from features.account import Category
from features.account.service import AccountService
from features.account.supabase_repository import SupabaseAccountRepo
from features.demo_mode import is_demo_mode
from features.notifications.service import NotificationService
from features.notifications.supabase_repository import SupabaseNotificationRepo
from features.workspaces.supabase_repository import SupabaseUserDirectory
from shared.config import settings
from shared.email.resend_adapter import ResendAdapter
from shared.supabase_client import get_supabase_client

logger = logging.getLogger(__name__)


def get_notification_service() -> NotificationService:
    client = get_supabase_client(service_role=True)
    users = SupabaseUserDirectory(client)
    key = settings.TRANSACTIONAL_EMAIL_API_KEY
    # never email from the offline demo dataset
    email = None if is_demo_mode() or not key or "dummy" in key.lower() else ResendAdapter()
    return NotificationService(
        SupabaseNotificationRepo(client),
        AccountService(SupabaseAccountRepo(client), users),
        users,
        email,
        settings.APP_URL,
    )


async def _notify_safely(**kwargs) -> None:
    try:
        await get_notification_service().notify(**kwargs)
    except Exception:
        logger.exception("Could not create notification %s", kwargs.get("title"))


def notify(
    background: BackgroundTasks,
    workspace_id: UUID,
    user_ids: list[UUID],
    category: Category,
    title: str,
    body: str = "",
    link: str = "",
    priority: str = "normal",
) -> None:
    """Create notifications right after the response is sent (never slows down or fails the request)."""
    if user_ids:
        background.add_task(
            _notify_safely,
            workspace_id=workspace_id,
            user_ids=user_ids,
            category=category,
            title=title,
            body=body,
            link=link,
            priority=priority,
        )
