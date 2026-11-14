from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel

from features.account import Category


class Notification(BaseModel):
    id: UUID
    workspace_id: UUID
    user_id: UUID
    category: Category
    priority: Literal["normal", "high"] = "normal"
    title: str
    body: str = ""
    # path inside the app to open, e.g. /dashboard/ws-1a2b3c4d/approvals
    link: str = ""
    dedupe_key: str | None = None
    read_at: datetime | None = None
    archived_at: datetime | None = None
    created_at: datetime


class UnreadCount(BaseModel):
    unread: int


class MarkRead(BaseModel):
    """Mark these notifications read; omit `ids` to mark all of them."""

    ids: list[UUID] | None = None
