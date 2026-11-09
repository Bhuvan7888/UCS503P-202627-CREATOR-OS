"""Supabase implementation of the messages repository."""

from uuid import UUID

from supabase import Client

from features.demo_mode import DemoFallbackMixin
from features.messages.models import Message
from shared.supabase_query import run_query


class SupabaseMessageRepo(DemoFallbackMixin):
    _fallback_repo_name = "message_repo"

    def __init__(self, client: Client):
        self.client = client

    async def create(self, message: Message) -> Message:
        res = await run_query(
            self.client.table("messages").insert(message.model_dump(mode="json", exclude={"id"}))
        )
        return Message.model_validate(res.data[0])

    async def list_for_thread(
        self, brand_id: UUID, creator_id: UUID, limit: int = 200
    ) -> list[Message]:
        res = await run_query(
            self.client.table("messages")
            .select("*")
            .eq("brand_id", str(brand_id))
            .eq("creator_id", str(creator_id))
            .order("created_at", desc=False)
            .limit(limit)
        )
        return [Message.model_validate(d) for d in res.data]

    async def mark_thread_read(self, brand_id: UUID, creator_id: UUID, reader_type: str) -> int:
        return 0

    async def get_unread_count(self, actor_type: str, actor_id: UUID) -> int:
        return 0

    async def get_unread_by_contact(self, actor_type: str, actor_id: UUID) -> dict[str, int]:
        return {}
