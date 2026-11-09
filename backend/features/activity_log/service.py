from datetime import UTC, datetime
from uuid import uuid4

from features.activity_log.models import ActivityLog
from features.activity_log.repository import ActivityLogRepo


class ActivityLogService:
    def __init__(self, activity_log_repo: ActivityLogRepo):
        self.repo = activity_log_repo

    async def record_action(
        self,
        brand_id: str,
        actor_type: str,
        actor_label: str,
        action: str,
        metadata: dict,
        deal_id: str | None = None
    ) -> ActivityLog:
        log = ActivityLog(
            id=uuid4(),
            brand_id=brand_id,
            deal_id=deal_id,
            actor_type=actor_type,
            actor_label=actor_label,
            action=action,
            metadata=metadata,
            created_at=datetime.now(UTC)
        )
        return await self.repo.create(log)

    async def get_logs_for_deal(self, deal_id: str, limit: int = 50, offset: int = 0) -> list[ActivityLog]:
        return await self.repo.list_for_deal(deal_id, limit, offset)

    async def get_logs_for_brand(self, brand_id: str, limit: int = 50, offset: int = 0) -> list[ActivityLog]:
        return await self.repo.list_for_brand(brand_id, limit, offset)

    async def get_logs_for_creator(self, creator_id: str, limit: int = 50, offset: int = 0) -> list[ActivityLog]:
        return await self.repo.list_for_creator(creator_id, limit, offset)
