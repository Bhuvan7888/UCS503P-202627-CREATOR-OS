"""Supabase implementation of the notification repository."""

from datetime import datetime
from uuid import UUID

from postgrest.exceptions import APIError
from postgrest.types import CountMethod
from supabase import Client

from features.demo_mode import DemoFallbackMixin
from features.notifications.models import Notification
from shared.supabase_query import run_query

_UNIQUE_VIOLATION = "23505"


class SupabaseNotificationRepo(DemoFallbackMixin):
    _fallback_repo_name = "notification_repo"

    def __init__(self, client: Client):
        self.client = client

    async def add(self, notification: Notification) -> bool:
        try:
            await run_query(
                self.client.table("notifications").insert(notification.model_dump(mode="json"))
            )
        except APIError as e:
            if e.code == _UNIQUE_VIOLATION:
                return False
            raise
        return True

    async def list_for_user(
        self, workspace_id: UUID, user_id: UUID, archived: bool, limit: int
    ) -> list[Notification]:
        query = (
            self.client.table("notifications")
            .select("*")
            .eq("workspace_id", str(workspace_id))
            .eq("user_id", str(user_id))
        )
        query = (
            query.not_.is_("archived_at", "null") if archived else query.is_("archived_at", "null")
        )
        res = await run_query(query.order("created_at", desc=True).limit(limit))
        return [Notification.model_validate(r) for r in res.data]

    async def unread_count(self, workspace_id: UUID, user_id: UUID) -> int:
        res = await run_query(
            self.client.table("notifications")
            .select("id", count=CountMethod.exact)
            .eq("workspace_id", str(workspace_id))
            .eq("user_id", str(user_id))
            .is_("read_at", "null")
            .is_("archived_at", "null")
        )
        return res.count or 0

    async def mark_read(
        self, workspace_id: UUID, user_id: UUID, ids: list[UUID] | None, at: datetime
    ) -> None:
        query = (
            self.client.table("notifications")
            .update({"read_at": at.isoformat()})
            .eq("workspace_id", str(workspace_id))
            .eq("user_id", str(user_id))
            .is_("read_at", "null")
        )
        if ids is not None:
            query = query.in_("id", [str(i) for i in ids])
        await run_query(query)

    async def archive(self, workspace_id: UUID, user_id: UUID, id: UUID, at: datetime) -> bool:
        res = await run_query(
            self.client.table("notifications")
            .update({"archived_at": at.isoformat(), "read_at": at.isoformat()})
            .eq("id", str(id))
            .eq("workspace_id", str(workspace_id))
            .eq("user_id", str(user_id))
        )
        return bool(res.data)
