"""Repository port (Protocol) for content items."""

from __future__ import annotations

from typing import Any, Protocol, runtime_checkable
from uuid import UUID

from features.content.models import ContentItem


@runtime_checkable
class ContentRepo(Protocol):
    async def create(self, item: ContentItem) -> ContentItem: ...
    async def get(self, id: UUID) -> ContentItem | None: ...
    async def list_for_workspace(self, workspace_id: UUID, limit: int) -> list[ContentItem]: ...
    async def update(self, id: UUID, changes: dict[str, Any]) -> ContentItem: ...
