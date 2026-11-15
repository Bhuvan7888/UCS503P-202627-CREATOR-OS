"""Supabase implementation of the platform snapshot repository (table growth_snapshots)."""

from uuid import UUID

from supabase import Client

from features.demo_mode import DemoFallbackMixin
from features.platform_stats.models import PlatformSnapshot
from shared.supabase_query import run_query

HISTORY_LIMIT = 500  # 5 platforms, ~100 updates each


class SupabasePlatformSnapshotRepo(DemoFallbackMixin):
    _fallback_repo_name = "platform_snapshot_repo"

    def __init__(self, client: Client):
        self.client = client

    async def list_for_creator(self, creator_id: UUID) -> list[PlatformSnapshot]:
        res = await run_query(
            self.client.table("growth_snapshots")
            .select("*")
            .eq("creator_id", str(creator_id))
            .order("recorded_at", desc=True)
            .limit(HISTORY_LIMIT)
        )
        return [PlatformSnapshot.model_validate(d) for d in res.data]

    async def upsert_many(self, snapshots: list[PlatformSnapshot]) -> None:
        rows = [s.model_dump(mode="json", exclude={"id", "created_at"}) for s in snapshots]
        await run_query(
            self.client.table("growth_snapshots").upsert(
                rows, on_conflict="creator_id,platform,recorded_at"
            )
        )
