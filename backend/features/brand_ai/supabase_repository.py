"""Supabase implementations of the brand AI repositories."""

from uuid import UUID

from supabase import Client

from features.brand_ai.models import BrandAiProfile, DealBrief
from features.demo_mode import DemoFallbackMixin
from shared.supabase_query import first_or_none, run_query


class SupabaseBrandAiProfileRepo(DemoFallbackMixin):
    _fallback_repo_name = "brand_ai_profile_repo"

    def __init__(self, client: Client):
        self.client = client

    async def get(self, brand_id: UUID) -> BrandAiProfile | None:
        res = await run_query(
            self.client.table("brand_ai_profiles").select("*").eq("brand_id", str(brand_id))
        )
        return first_or_none(BrandAiProfile, res)

    async def upsert(self, profile: BrandAiProfile) -> BrandAiProfile:
        res = await run_query(
            self.client.table("brand_ai_profiles").upsert(profile.model_dump(mode="json"))
        )
        return BrandAiProfile.model_validate(res.data[0])


class SupabaseDealBriefRepo(DemoFallbackMixin):
    _fallback_repo_name = "deal_brief_repo"

    def __init__(self, client: Client):
        self.client = client

    async def get(self, deal_id: UUID) -> DealBrief | None:
        res = await run_query(
            self.client.table("deal_briefs").select("*").eq("deal_id", str(deal_id))
        )
        return first_or_none(DealBrief, res)

    async def save(self, brief: DealBrief) -> DealBrief:
        res = await run_query(
            self.client.table("deal_briefs").upsert(brief.model_dump(mode="json"))
        )
        return DealBrief.model_validate(res.data[0])
