from datetime import UTC, date, datetime
from uuid import UUID, uuid4

from features.creators import CreatorRepo
from features.platform_stats.models import CreatorAudience, PlatformSnapshot, PlatformStatsSave
from features.platform_stats.repository import PlatformSnapshotRepo
from features.platform_stats.rules import creator_totals, summarize
from shared.errors import NotFoundError


class PlatformStatsService:
    """Per-platform analytics a creator updates by hand; saving also refreshes the totals brands see."""

    def __init__(self, snapshot_repo: PlatformSnapshotRepo, creator_repo: CreatorRepo):
        self.snapshot_repo = snapshot_repo
        self.creator_repo = creator_repo

    async def audience(self, creator_id: UUID) -> CreatorAudience:
        summaries = summarize(await self.snapshot_repo.list_for_creator(creator_id))
        return CreatorAudience(
            creator_id=creator_id,
            platforms=summaries,
            total_followers=sum(s.followers_count for s in summaries),
            as_of=max((s.recorded_at for s in summaries), default=None),
        )

    async def save_today(
        self, creator_id: UUID, request: PlatformStatsSave, today: date | None = None
    ) -> CreatorAudience:
        if await self.creator_repo.get(creator_id) is None:
            raise NotFoundError("Creator not found")
        now = datetime.now(UTC)
        day = today or now.date()
        await self.snapshot_repo.upsert_many(
            [
                PlatformSnapshot(
                    id=uuid4(),
                    creator_id=creator_id,
                    recorded_at=day,
                    created_at=now,
                    **e.model_dump(),
                )
                for e in request.entries
            ]
        )
        result = await self.audience(creator_id)
        await self.creator_repo.update(
            creator_id, {**creator_totals(result.platforms), "stats_updated_at": now.isoformat()}
        )
        return result

    async def can_view(
        self, viewer_brand_id: UUID | None, viewer_creator_id: UUID | None, creator_id: UUID
    ) -> bool:
        if viewer_creator_id == creator_id:
            return True
        return viewer_brand_id is not None and await self.creator_repo.is_linked_to_brand(
            creator_id, viewer_brand_id
        )
