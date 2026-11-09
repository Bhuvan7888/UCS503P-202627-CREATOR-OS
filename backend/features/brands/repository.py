"""Repository ports (Protocols) for brands and brand members."""

from __future__ import annotations

from typing import Protocol, runtime_checkable
from uuid import UUID

from features.brands.models import Brand, BrandMember


@runtime_checkable
class BrandRepo(Protocol):
    async def create(self, brand: Brand) -> Brand: ...
    async def get(self, id: UUID) -> Brand | None: ...


@runtime_checkable
class BrandMemberRepo(Protocol):
    async def create(self, member: BrandMember) -> BrandMember: ...
    async def list_for_brand(self, brand_id: UUID) -> list[BrandMember]: ...
    async def get_by_user_id(self, user_id: UUID) -> BrandMember | None: ...
