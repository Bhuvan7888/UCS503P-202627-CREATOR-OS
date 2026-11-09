"""Supabase implementation of the contracts repository."""

from uuid import UUID

from supabase import Client

from features.contracts.models import Contract
from features.demo_mode import DemoFallbackMixin
from shared.supabase_query import first_or_none, run_query


class SupabaseContractRepo(DemoFallbackMixin):
    _fallback_repo_name = "contract_repo"

    def __init__(self, client: Client):
        self.client = client

    async def create(self, contract: Contract) -> Contract:
        res = await run_query(
            self.client.table("contracts").insert(contract.model_dump(mode="json", exclude={"id"}))
        )
        return Contract.model_validate(res.data[0])

    async def get(self, id: UUID) -> Contract | None:
        res = await run_query(self.client.table("contracts").select("*").eq("id", str(id)))
        return first_or_none(Contract, res)

    async def list_for_brand(
        self, brand_id: UUID, limit: int = 50, offset: int = 0
    ) -> list[Contract]:
        res = await run_query(
            self.client.table("contracts")
            .select("*, deals!inner(brand_id)")
            .eq("deals.brand_id", str(brand_id))
            .order("created_at", desc=True)
            .range(offset, offset + limit - 1)
        )
        # Ensure we only return the contract data, stripping the joined deal
        return [
            Contract.model_validate({k: v for k, v in d.items() if k != "deals"}) for d in res.data
        ]

    async def list_for_creator(
        self, creator_id: UUID, limit: int = 50, offset: int = 0
    ) -> list[Contract]:
        linked = await run_query(
            self.client.table("contracts")
            .select("*, deals!inner(creator_id)")
            .eq("deals.creator_id", str(creator_id))
        )
        personal = await run_query(
            self.client.table("contracts").select("*").eq("creator_id", str(creator_id))
        )
        by_id = {d["id"]: {k: v for k, v in d.items() if k != "deals"} for d in linked.data}
        by_id.update({d["id"]: d for d in personal.data})
        merged = sorted(by_id.values(), key=lambda d: d["created_at"], reverse=True)
        return [Contract.model_validate(d) for d in merged[offset : offset + limit]]

    async def update_status(self, id: UUID, status: str) -> Contract:
        res = await run_query(
            self.client.table("contracts").update({"status": status}).eq("id", str(id))
        )
        return Contract.model_validate(res.data[0])

    async def update_status_and_previous(
        self, id: UUID, status: str, previous_status: str | None
    ) -> Contract:
        res = await run_query(
            self.client.table("contracts")
            .update({"status": status, "previous_status": previous_status})
            .eq("id", str(id))
        )
        return Contract.model_validate(res.data[0])

    async def update_raw_text(self, id: UUID, raw_text: str) -> Contract:
        res = await run_query(
            self.client.table("contracts").update({"raw_text": raw_text}).eq("id", str(id))
        )
        return Contract.model_validate(res.data[0])

    async def update_creator_status(self, id: UUID, creator_status: str) -> Contract:
        res = await run_query(
            self.client.table("contracts")
            .update({"creator_status": creator_status})
            .eq("id", str(id))
        )
        return Contract.model_validate(res.data[0])
