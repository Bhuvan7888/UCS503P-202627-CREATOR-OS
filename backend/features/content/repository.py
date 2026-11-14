"""Repository port (Protocol) for content items."""

from __future__ import annotations

from datetime import date
from typing import Any, Protocol, runtime_checkable
from uuid import UUID

from features.content.models import ContentItem, ContentScript


@runtime_checkable
class ContentRepo(Protocol):
    async def create(self, item: ContentItem) -> ContentItem: ...
    async def get(self, id: UUID) -> ContentItem | None: ...
    async def list_for_workspace(self, workspace_id: UUID, limit: int) -> list[ContentItem]: ...
    async def update(self, id: UUID, changes: dict[str, Any]) -> ContentItem: ...
    async def list_due_on(self, day: date, limit: int) -> list[ContentItem]:
        """Unpublished items due on `day`, across all workspaces (deadline reminders)."""
        ...


@runtime_checkable
class ScriptRepo(Protocol):
    async def get(self, content_item_id: UUID) -> ContentScript | None: ...
    async def upsert(self, script: ContentScript) -> ContentScript: ...
    async def scripted_item_ids(self, workspace_id: UUID) -> frozenset[UUID]: ...
