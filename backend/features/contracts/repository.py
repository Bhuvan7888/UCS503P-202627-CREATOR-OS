"""Repository port (Protocol) for contracts."""

from __future__ import annotations

from typing import Protocol, runtime_checkable
from uuid import UUID

from features.contracts.models import Contract


@runtime_checkable
class ContractRepo(Protocol):
    async def create(self, contract: Contract) -> Contract: ...
    async def get(self, id: UUID) -> Contract | None: ...
    async def list_for_brand(
        self, brand_id: UUID, limit: int = 50, offset: int = 0
    ) -> list[Contract]: ...
    async def list_for_creator(
        self, creator_id: UUID, limit: int = 50, offset: int = 0
    ) -> list[Contract]: ...
    async def update_status(self, id: UUID, status: str) -> Contract: ...
    async def update_status_and_previous(
        self, id: UUID, status: str, previous_status: str | None
    ) -> Contract: ...
    async def update_raw_text(self, id: UUID, raw_text: str) -> Contract: ...
