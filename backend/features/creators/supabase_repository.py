"""Supabase implementations of the creator and growth-snapshot repositories."""

from uuid import UUID

from supabase import Client

from features.brands import Brand
from features.creators.models import Creator
from features.demo_mode import DemoFallbackMixin
from shared.supabase_query import first_or_none, run_query


class SupabaseCreatorRepo(DemoFallbackMixin):
    _fallback_repo_name = "creator_repo"

    def __init__(self, client: Client):
        self.client = client

    async def create(self, creator: Creator) -> Creator:
        res = await run_query(
            self.client.table("creators").insert(creator.model_dump(mode="json", exclude={"id"}))
        )
        return Creator.model_validate(res.data[0])

    async def get(self, id: UUID) -> Creator | None:
        res = await run_query(self.client.table("creators").select("*").eq("id", str(id)))
        return first_or_none(Creator, res)

    async def list_for_brand(
        self, brand_id: UUID, limit: int = 50, offset: int = 0
    ) -> list[Creator]:
        res = await run_query(
            self.client.table("creator_brand_links")
            .select("creators(*)")
            .eq("brand_id", str(brand_id))
            .order("linked_at", desc=True)
            .range(offset, offset + limit - 1)
        )
        return [Creator.model_validate(d["creators"]) for d in res.data if d.get("creators")]

    async def get_by_user_id(self, user_id: UUID) -> Creator | None:
        res = await run_query(self.client.table("creators").select("*").eq("user_id", str(user_id)))
        return first_or_none(Creator, res)

    async def link_brand(self, creator_id: UUID, brand_id: UUID) -> None:
        if await self.is_linked_to_brand(creator_id, brand_id):
            return
        await run_query(
            self.client.table("creator_brand_links").insert(
                {"creator_id": str(creator_id), "brand_id": str(brand_id)}
            )
        )

    async def is_linked_to_brand(self, creator_id: UUID, brand_id: UUID) -> bool:
        res = await run_query(
            self.client.table("creator_brand_links")
            .select("id")
            .eq("creator_id", str(creator_id))
            .eq("brand_id", str(brand_id))
        )
        return bool(res.data)

    async def list_linked_brands(self, creator_id: UUID) -> list[Brand]:
        res = await run_query(
            self.client.table("creator_brand_links")
            .select("brands(*)")
            .eq("creator_id", str(creator_id))
            .order("linked_at", desc=True)
        )
        return [Brand.model_validate(d["brands"]) for d in res.data if d.get("brands")]
