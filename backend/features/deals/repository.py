"""Repository port (Protocol) for deals."""

from __future__ import annotations

from typing import Protocol, runtime_checkable
from uuid import UUID

from features.deals.models import Deal


@runtime_checkable
class DealRepo(Protocol):
    async def create(self, deal: Deal) -> Deal: ...
    async def get(self, id: UUID) -> Deal | None: ...
    async def list_for_brand(
        self, brand_id: UUID, limit: int = 50, offset: int = 0
    ) -> list[Deal]: ...
    async def list_for_creator(
        self, creator_id: UUID, limit: int = 50, offset: int = 0
    ) -> list[Deal]: ...
    async def update_status(self, id: UUID, status: str) -> Deal: ...
    async def mark_viewed(self, id: UUID) -> Deal: ...
