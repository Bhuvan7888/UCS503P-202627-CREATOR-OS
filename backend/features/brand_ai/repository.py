"""Repository ports (Protocols) for brand AI."""

from __future__ import annotations

from typing import Protocol, runtime_checkable
from uuid import UUID

from features.brand_ai.models import BrandAiProfile, DealBrief


@runtime_checkable
class BrandAiProfileRepo(Protocol):
    async def get(self, brand_id: UUID) -> BrandAiProfile | None: ...
    async def upsert(self, profile: BrandAiProfile) -> BrandAiProfile: ...


@runtime_checkable
class DealBriefRepo(Protocol):
    async def get(self, deal_id: UUID) -> DealBrief | None: ...
    async def save(self, brief: DealBrief) -> DealBrief: ...
