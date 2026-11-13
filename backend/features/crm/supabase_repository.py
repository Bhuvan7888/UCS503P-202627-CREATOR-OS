"""Supabase implementation of the Brand CRM repository."""

from typing import Any
from uuid import UUID

from pydantic import TypeAdapter
from supabase import Client

from features.crm.models import CrmDeal
from features.demo_mode import DemoFallbackMixin
from shared.supabase_query import first_or_none, run_query

_to_json = TypeAdapter(dict[str, Any])


class SupabaseCrmDealRepo(DemoFallbackMixin):
    _fallback_repo_name = "crm_deal_repo"

    def __init__(self, client: Client):
        self.client = client

    async def create(self, deal: CrmDeal) -> CrmDeal:
        res = await run_query(self.client.table("crm_deals").insert(deal.model_dump(mode="json")))
        return CrmDeal.model_validate(res.data[0])

    async def get(self, id: UUID) -> CrmDeal | None:
        res = await run_query(self.client.table("crm_deals").select("*").eq("id", str(id)))
        return first_or_none(CrmDeal, res)

    async def list_for_workspace(self, workspace_id: UUID, limit: int) -> list[CrmDeal]:
        res = await run_query(
            self.client.table("crm_deals")
            .select("*")
            .eq("workspace_id", str(workspace_id))
            .order("updated_at", desc=True)
            .limit(limit)
        )
        return [CrmDeal.model_validate(row) for row in res.data]

    async def update(self, id: UUID, changes: dict[str, Any]) -> CrmDeal:
        res = await run_query(
            self.client.table("crm_deals")
            .update(_to_json.dump_python(changes, mode="json"))
            .eq("id", str(id))
        )
        return CrmDeal.model_validate(res.data[0])

    async def delete(self, id: UUID) -> None:
        await run_query(self.client.table("crm_deals").delete().eq("id", str(id)))
