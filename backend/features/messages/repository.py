"""Repository port (Protocol) for messages."""

from __future__ import annotations

from typing import Protocol, runtime_checkable
from uuid import UUID

from features.messages.models import Message


@runtime_checkable
class MessageRepo(Protocol):
    async def create(self, message: Message) -> Message: ...
    async def list_for_thread(
        self, brand_id: UUID, creator_id: UUID, limit: int = 200
    ) -> list[Message]: ...
    async def mark_thread_read(self, brand_id: UUID, creator_id: UUID, reader_type: str) -> int: ...
    async def get_unread_count(self, actor_type: str, actor_id: UUID) -> int: ...
    async def get_unread_by_contact(self, actor_type: str, actor_id: UUID) -> dict[str, int]: ...
