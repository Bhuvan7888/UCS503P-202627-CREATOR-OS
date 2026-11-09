"""Supabase implementations of the creator and growth-snapshot repositories."""

from uuid import UUID

from supabase import Client

from features.brands import Brand
from features.creators.models import Creator, GrowthSnapshot
from features.demo_mode import DemoFallbackMixin
from shared.supabase_query import first_or_none, run_query


class SupabaseCreatorRepo(DemoFallbackMixin):
    _fallback_repo_name = "creator_repo"
    def __init__(self, client: Client):
        self.client = client
    async def create(self, creator: Creator) -> Creator:
        res = await run_query(self.client.table("creators").insert(creator.model_dump(mode="json", exclude={"id"})))
        return Creator.model_validate(res.data[0])
    async def get(self, id: UUID) -> Creator | None:
        res = await run_query(self.client.table("creators").select("*").eq("id", str(id)))
        return first_or_none(Creator, res)
    async def list_for_brand(self, brand_id: UUID, limit: int = 50, offset: int = 0) -> list[Creator]:
        res = (
            await run_query(self.client.table("creator_brand_links").select("creators(*)")
            .eq("brand_id", str(brand_id))
            .order("linked_at", desc=True).range(offset, offset + limit - 1))
        )
        return [Creator.model_validate(d["creators"]) for d in res.data if d.get("creators")]
    async def get_by_user_id(self, user_id: UUID) -> Creator | None:
        res = await run_query(self.client.table("creators").select("*").eq("user_id", str(user_id)))
        return first_or_none(Creator, res)
    async def update_profile(
        self, id: UUID, followers_count: int, engagement_rate: float,
        avg_views_per_week: int | None = None,
    ) -> Creator:
        update_data = {"followers_count": followers_count, "engagement_rate": engagement_rate}
        if avg_views_per_week is not None:
            update_data["avg_views_per_week"] = avg_views_per_week
        res = await run_query(self.client.table("creators").update(update_data).eq("id", str(id)))
        return Creator.model_validate(res.data[0])
    async def link_brand(self, creator_id: UUID, brand_id: UUID) -> None:
        if await self.is_linked_to_brand(creator_id, brand_id):
            return
        await run_query(self.client.table("creator_brand_links").insert(
            {"creator_id": str(creator_id), "brand_id": str(brand_id)}
        ))
    async def is_linked_to_brand(self, creator_id: UUID, brand_id: UUID) -> bool:
        res = (
            await run_query(self.client.table("creator_brand_links").select("id")
            .eq("creator_id", str(creator_id)).eq("brand_id", str(brand_id)))
        )
        return bool(res.data)
    async def list_linked_brands(self, creator_id: UUID) -> list[Brand]:
        res = (
            await run_query(self.client.table("creator_brand_links").select("brands(*)")
            .eq("creator_id", str(creator_id)).order("linked_at", desc=True))
        )
        return [Brand.model_validate(d["brands"]) for d in res.data if d.get("brands")]


class SupabaseGrowthSnapshotRepo(DemoFallbackMixin):
    _fallback_repo_name = "growth_repo"
    def __init__(self, client: Client):
        self.client = client
    async def create(self, snapshot: GrowthSnapshot) -> GrowthSnapshot:
        res = (
            await run_query(self.client.table("growth_snapshots")
            .upsert(snapshot.model_dump(mode="json", exclude={"id"}), on_conflict="creator_id,recorded_at"))
        )
        return GrowthSnapshot.model_validate(res.data[0])
    async def list_for_creator(self, creator_id: UUID, limit: int = 60) -> list[GrowthSnapshot]:
        res = (
            await run_query(self.client.table("growth_snapshots").select("*").eq("creator_id", str(creator_id))
            .order("recorded_at", desc=True).limit(limit))
        )
        return [GrowthSnapshot.model_validate(d) for d in res.data]
