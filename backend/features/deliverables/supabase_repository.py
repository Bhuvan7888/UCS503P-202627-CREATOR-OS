"""Supabase implementation of the deliverables repository."""

from uuid import UUID

from supabase import Client

from features.deliverables.models import Deliverable
from features.demo_mode import DemoFallbackMixin
from shared.supabase_query import first_or_none, run_query


class SupabaseDeliverableRepo(DemoFallbackMixin):
    _fallback_repo_name = "deliverable_repo"
    def __init__(self, client: Client):
        self.client = client
    async def create(self, deliverable: Deliverable) -> Deliverable:
        res = await run_query(self.client.table("deliverables").insert(deliverable.model_dump(mode="json", exclude={"id"})))
        return Deliverable.model_validate(res.data[0])
    async def get(self, id: UUID) -> Deliverable | None:
        res = await run_query(self.client.table("deliverables").select("*").eq("id", str(id)))
        return first_or_none(Deliverable, res)
    async def list_for_brand(self, brand_id: UUID, limit: int = 50, offset: int = 0) -> list[Deliverable]:
        res = (
            await run_query(self.client.table("deliverables").select("*, deals!inner(brand_id)")
            .eq("deals.brand_id", str(brand_id))
            .order("created_at", desc=True).range(offset, offset + limit - 1))
        )
        return [Deliverable.model_validate({k: v for k, v in d.items() if k != 'deals'}) for d in res.data]
    async def list_for_creator(self, creator_id: UUID, limit: int = 50, offset: int = 0) -> list[Deliverable]:
        res = (
            await run_query(self.client.table("deliverables").select("*, deals!inner(creator_id)")
            .eq("deals.creator_id", str(creator_id))
            .order("created_at", desc=True).range(offset, offset + limit - 1))
        )
        return [Deliverable.model_validate({k: v for k, v in d.items() if k != 'deals'}) for d in res.data]
    async def update_status(self, id: UUID, status: str, previous_status: str | None = None) -> Deliverable:
        res = await run_query(self.client.table("deliverables").update({"status": status}).eq("id", str(id)))
        return Deliverable.model_validate(res.data[0])
