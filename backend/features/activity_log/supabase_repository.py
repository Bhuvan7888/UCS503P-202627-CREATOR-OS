"""Supabase implementation of the activity-log repository."""

import asyncio
from uuid import UUID

from supabase import Client

from features.activity_log.models import ActivityLog
from features.demo_mode import DemoFallbackMixin


class SupabaseActivityLogRepo(DemoFallbackMixin):
    _fallback_repo_name = "activity_log_repo"
    def __init__(self, client: Client):
        self.client = client
    async def create(self, log: ActivityLog) -> ActivityLog:
        res = await asyncio.to_thread(lambda: self.client.table("activity_log").insert(log.model_dump(mode="json", exclude={"id"})).execute())
        return ActivityLog.model_validate(res.data[0])
    async def get(self, id: UUID) -> ActivityLog | None:
        res = await asyncio.to_thread(lambda: self.client.table("activity_log").select("*").eq("id", str(id)).execute())
        return ActivityLog.model_validate(res.data[0]) if res.data else None
    async def list_for_brand(self, brand_id: UUID, limit: int = 50, offset: int = 0) -> list[ActivityLog]:
        res = (
            await asyncio.to_thread(lambda: self.client.table("activity_log").select("*").eq("brand_id", str(brand_id))
            .order("created_at", desc=True).range(offset, offset + limit - 1).execute())
        )
        return [ActivityLog.model_validate(d) for d in res.data]
    async def list_for_deal(self, deal_id: UUID, limit: int = 50, offset: int = 0) -> list[ActivityLog]:
        res = (
            await asyncio.to_thread(lambda: self.client.table("activity_log").select("*").eq("deal_id", str(deal_id))
            .order("created_at", desc=True).range(offset, offset + limit - 1).execute())
        )
        return [ActivityLog.model_validate(d) for d in res.data]
    async def list_for_creator(self, creator_id: UUID, limit: int = 50, offset: int = 0) -> list[ActivityLog]:
        res = (
            await asyncio.to_thread(lambda: self.client.table("activity_log").select("*, deals!inner(creator_id)")
            .eq("deals.creator_id", str(creator_id))
            .order("created_at", desc=True).range(offset, offset + limit - 1).execute())
        )
        return [ActivityLog.model_validate({k: v for k, v in d.items() if k != 'deals'}) for d in res.data]
