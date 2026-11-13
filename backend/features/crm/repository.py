"""Repository port for Brand CRM deals."""

from __future__ import annotations

from typing import Any, Protocol, runtime_checkable
from uuid import UUID

from features.crm.models import CrmDeal


@runtime_checkable
class CrmDealRepo(Protocol):
    async def create(self, deal: CrmDeal) -> CrmDeal: ...
    async def get(self, id: UUID) -> CrmDeal | None: ...
    async def list_for_workspace(self, workspace_id: UUID, limit: int) -> list[CrmDeal]: ...
    async def update(self, id: UUID, changes: dict[str, Any]) -> CrmDeal: ...
    async def delete(self, id: UUID) -> None: ...
