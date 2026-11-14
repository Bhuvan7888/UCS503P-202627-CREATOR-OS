"""Repository port for notifications."""

from __future__ import annotations

from datetime import datetime
from typing import Protocol, runtime_checkable
from uuid import UUID

from features.notifications.models import Notification


@runtime_checkable
class NotificationRepo(Protocol):
    async def add(self, notification: Notification) -> bool:
        """False when a notification with the same (user, dedupe_key) already exists."""
        ...

    async def list_for_user(
        self, workspace_id: UUID, user_id: UUID, archived: bool, limit: int
    ) -> list[Notification]: ...
    async def unread_count(self, workspace_id: UUID, user_id: UUID) -> int: ...
    async def mark_read(
        self, workspace_id: UUID, user_id: UUID, ids: list[UUID] | None, at: datetime
    ) -> None: ...
    async def archive(self, workspace_id: UUID, user_id: UUID, id: UUID, at: datetime) -> bool: ...
