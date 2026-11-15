"""Supabase implementations of the brand and brand-member repositories."""

from typing import Any
from uuid import UUID

from supabase import Client

from features.brands.models import Brand, BrandMember
from features.demo_mode import DemoFallbackMixin
from shared.supabase_query import first_or_none, run_query


class SupabaseBrandRepo(DemoFallbackMixin):
    _fallback_repo_name = "brand_repo"

    def __init__(self, client: Client):
        self.client = client

    async def create(self, brand: Brand) -> Brand:
        res = await run_query(
            # exclude_none: unset profile fields are left to the column defaults
            self.client.table("brands").insert(
                brand.model_dump(mode="json", exclude={"id"}, exclude_none=True)
            )
        )
        return Brand.model_validate(res.data[0])

    async def get(self, id: UUID) -> Brand | None:
        res = await run_query(self.client.table("brands").select("*").eq("id", str(id)))
        return first_or_none(Brand, res)

    async def update(self, id: UUID, fields: dict[str, Any]) -> Brand:
        res = await run_query(self.client.table("brands").update(fields).eq("id", str(id)))
        return Brand.model_validate(res.data[0])


class SupabaseBrandMemberRepo(DemoFallbackMixin):
    _fallback_repo_name = "brand_member_repo"

    def __init__(self, client: Client):
        self.client = client

    async def create(self, member: BrandMember) -> BrandMember:
        res = await run_query(
            self.client.table("brand_members").insert(
                member.model_dump(mode="json", exclude={"id"})
            )
        )
        return BrandMember.model_validate(res.data[0])

    async def list_for_brand(self, brand_id: UUID) -> list[BrandMember]:
        res = await run_query(
            self.client.table("brand_members").select("*").eq("brand_id", str(brand_id))
        )
        return [BrandMember.model_validate(d) for d in res.data]

    async def get_by_user_id(self, user_id: UUID) -> BrandMember | None:
        res = await run_query(
            self.client.table("brand_members").select("*").eq("user_id", str(user_id))
        )
        return first_or_none(BrandMember, res)
