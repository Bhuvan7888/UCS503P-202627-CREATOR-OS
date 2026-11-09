"""Repository port (Protocol) for the activity log."""

from __future__ import annotations

from typing import Protocol, runtime_checkable
from uuid import UUID

from features.activity_log.models import ActivityLog


@runtime_checkable
class ActivityLogRepo(Protocol):
    async def create(self, log: ActivityLog) -> ActivityLog: ...
    async def get(self, id: UUID) -> ActivityLog | None: ...
    async def list_for_brand(self, brand_id: UUID, limit: int = 50, offset: int = 0) -> list[ActivityLog]: ...
    async def list_for_deal(self, deal_id: UUID, limit: int = 50, offset: int = 0) -> list[ActivityLog]: ...
    async def list_for_creator(self, creator_id: UUID, limit: int = 50, offset: int = 0) -> list[ActivityLog]: ...
