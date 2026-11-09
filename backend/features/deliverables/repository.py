"""Repository port (Protocol) for deliverables."""

from __future__ import annotations

from typing import Protocol, runtime_checkable
from uuid import UUID

from features.deliverables.models import Deliverable


@runtime_checkable
class DeliverableRepo(Protocol):
    async def create(self, deliverable: Deliverable) -> Deliverable: ...
    async def get(self, id: UUID) -> Deliverable | None: ...
    async def list_for_brand(
        self, brand_id: UUID, limit: int = 50, offset: int = 0
    ) -> list[Deliverable]: ...
    async def list_for_creator(
        self, creator_id: UUID, limit: int = 50, offset: int = 0
    ) -> list[Deliverable]: ...
    async def update_status(
        self, id: UUID, status: str, previous_status: str | None = None
    ) -> Deliverable: ...
