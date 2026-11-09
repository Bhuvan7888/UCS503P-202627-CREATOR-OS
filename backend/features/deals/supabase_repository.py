"""Supabase implementation of the deals repository."""

import asyncio
from datetime import UTC, datetime
from uuid import UUID

from supabase import Client

from features.deals.models import Deal
from features.demo_mode import DemoFallbackMixin


class SupabaseDealRepo(DemoFallbackMixin):
    _fallback_repo_name = "deal_repo"
    def __init__(self, client: Client):
        self.client = client
    async def create(self, deal: Deal) -> Deal:
        res = await asyncio.to_thread(lambda: self.client.table("deals").insert(deal.model_dump(mode="json", exclude={"id"})).execute())
        return Deal.model_validate(res.data[0])
    async def get(self, id: UUID) -> Deal | None:
        res = await asyncio.to_thread(lambda: self.client.table("deals").select("*").eq("id", str(id)).execute())
        return Deal.model_validate(res.data[0]) if res.data else None
    async def list_for_brand(self, brand_id: UUID, limit: int = 50, offset: int = 0) -> list[Deal]:
        res = (
            await asyncio.to_thread(lambda: self.client.table("deals").select("*").eq("brand_id", str(brand_id))
            .order("created_at", desc=True).range(offset, offset + limit - 1).execute())
        )
        return [Deal.model_validate(d) for d in res.data]
    async def list_for_creator(self, creator_id: UUID, limit: int = 50, offset: int = 0) -> list[Deal]:
        res = (
            await asyncio.to_thread(lambda: self.client.table("deals").select("*").eq("creator_id", str(creator_id))
            .order("created_at", desc=True).range(offset, offset + limit - 1).execute())
        )
        return [Deal.model_validate(d) for d in res.data]
    async def update_status(self, id: UUID, status: str) -> Deal:
        res = (
            await asyncio.to_thread(lambda: self.client.table("deals")
            .update({"status": status, "updated_at": datetime.now(UTC).isoformat()})
            .eq("id", str(id)).execute())
        )
        return Deal.model_validate(res.data[0])
    async def mark_viewed(self, id: UUID) -> Deal:
        res = (
            await asyncio.to_thread(lambda: self.client.table("deals")
            .update({"brand_viewed_at": datetime.now(UTC).isoformat()})
            .eq("id", str(id)).execute())
        )
        return Deal.model_validate(res.data[0])
