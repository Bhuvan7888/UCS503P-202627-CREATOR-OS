from datetime import UTC, datetime
from uuid import UUID, uuid4

from domain.interfaces.repositories import BrandRepo, CreatorRepo, GrowthSnapshotRepo
from domain.models.brand import Brand
from domain.models.creator import (
    Creator,
    CreatorOnboardRequest,
    GrowthSnapshot,
    GrowthSnapshotCreateRequest,
)
from features.activity_log import ActivityLog, ActivityLogRepo
from shared.errors import ValidationError


class CreatorService:
    def __init__(
        self, creator_repo: CreatorRepo, activity_log_repo: ActivityLogRepo,
        brand_repo: BrandRepo | None = None, growth_snapshot_repo: GrowthSnapshotRepo | None = None,
    ):
        self.creator_repo = creator_repo
        self.activity_log_repo = activity_log_repo
        self.brand_repo = brand_repo
        self.growth_snapshot_repo = growth_snapshot_repo

    async def onboard_creator(
        self, 
        request: CreatorOnboardRequest, 
        brand_id: UUID, 
        actor_id: UUID, 
        actor_type: str
    ) -> Creator:
        creator = Creator(
            id=uuid4(),
            brand_id=brand_id,
            display_name=request.display_name,
            instagram_handle=request.instagram_handle,
            niche=request.niche,
            follower_tier=request.follower_tier,
            followers_count=request.followers_count,
            engagement_rate=request.engagement_rate,
            avg_views_per_week=request.avg_views_per_week,
            created_at=datetime.now(UTC)
        )
        created = await self.creator_repo.create(creator)
        await self.creator_repo.link_brand(created.id, brand_id)

        log = ActivityLog(
            id=uuid4(),
            brand_id=brand_id,
            deal_id=None,
            actor_type=actor_type,
            actor_label=str(actor_id),
            action="creator_onboarded",
            metadata={"creator_id": str(created.id), "handle": created.instagram_handle},
            created_at=datetime.now(UTC)
        )
        await self.activity_log_repo.create(log)

        return created

    async def list_for_brand(self, brand_id: UUID, limit: int = 50, offset: int = 0) -> list[Creator]:
        return await self.creator_repo.list_for_brand(brand_id, limit, offset)

    async def update_profile(
        self, creator_id: UUID, followers_count: int, engagement_rate: float,
        avg_views_per_week: int | None = None,
    ) -> Creator:
        return await self.creator_repo.update_profile(
            creator_id, followers_count, engagement_rate, avg_views_per_week
        )

    async def link_brand(self, creator_id: UUID, invite_code: str) -> Brand:
        try:
            brand_id = UUID(invite_code)
        except ValueError as e:
            raise ValidationError("Invalid invite code.") from e
        brand = await self.brand_repo.get(brand_id)
        if not brand:
            raise ValidationError("Invalid invite code.")
        await self.creator_repo.link_brand(creator_id, brand_id)

        creator = await self.creator_repo.get(creator_id)
        log = ActivityLog(
            id=uuid4(),
            brand_id=brand_id,
            deal_id=None,
            actor_type="creator",
            actor_label=str(creator_id),
            action="creator_linked_via_invite",
            metadata={"creator_id": str(creator_id), "creator_name": creator.display_name if creator else None},
            created_at=datetime.now(UTC)
        )
        await self.activity_log_repo.create(log)

        return brand

    async def list_linked_brands(self, creator_id: UUID) -> list[Brand]:
        return await self.creator_repo.list_linked_brands(creator_id)

    async def add_growth_snapshot(self, creator_id: UUID, request: GrowthSnapshotCreateRequest) -> GrowthSnapshot:
        snapshot = GrowthSnapshot(
            id=uuid4(), creator_id=creator_id, recorded_at=request.recorded_at,
            followers_count=request.followers_count, engagement_rate=request.engagement_rate,
            created_at=datetime.now(UTC),
        )
        return await self.growth_snapshot_repo.create(snapshot)

    async def list_growth_snapshots(self, creator_id: UUID, limit: int = 60) -> list[GrowthSnapshot]:
        return await self.growth_snapshot_repo.list_for_creator(creator_id, limit)
