"""Supabase implementation of the benchmarks repository."""

import asyncio

from supabase import Client

from features.demo_mode import DemoFallbackMixin


class SupabaseRateBenchmarkRepo(DemoFallbackMixin):
    _fallback_repo_name = "benchmark_repo"
    def __init__(self, client: Client):
        self.client = client
    async def get_historical_rates(self, niche: str, follower_tier: str) -> list[float]:
        res = (
            await asyncio.to_thread(lambda: self.client.table("negotiation_sessions")
            .select("base_rate, deals!inner(creators!inner(niche, follower_tier))")
            .eq("deals.creators.niche", niche)
            .eq("deals.creators.follower_tier", follower_tier)
            .execute())
        )
        return [row["base_rate"] for row in res.data]  # type: ignore
