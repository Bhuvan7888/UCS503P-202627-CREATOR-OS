from datetime import UTC, datetime
from typing import Literal
from uuid import UUID, uuid4

from features.messages.models import Message
from features.messages.repository import MessageRepo


class MessageService:
    def __init__(self, message_repo: MessageRepo):
        self.message_repo = message_repo

    async def send(
        self, brand_id: UUID, creator_id: UUID, sender_type: Literal["brand", "creator"], body: str
    ) -> Message:
        message = Message(
            id=uuid4(), brand_id=brand_id, creator_id=creator_id,
            sender_type=sender_type, body=body, created_at=datetime.now(UTC),
            read_at=None,
        )
        return await self.message_repo.create(message)

    async def list_thread(self, brand_id: UUID, creator_id: UUID) -> list[Message]:
        return await self.message_repo.list_for_thread(brand_id, creator_id)

    async def mark_thread_read(self, brand_id: UUID, creator_id: UUID, reader_type: Literal["brand", "creator"]) -> int:
        return await self.message_repo.mark_thread_read(brand_id, creator_id, reader_type)

    async def get_unread_summary(self, actor_type: Literal["brand", "creator"], actor_id: UUID) -> dict:
        total = await self.message_repo.get_unread_count(actor_type, actor_id)
        by_contact = await self.message_repo.get_unread_by_contact(actor_type, actor_id)
        return {"unread_count": total, "has_unread": total > 0, "by_contact": by_contact}
