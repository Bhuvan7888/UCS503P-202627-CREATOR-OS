"""Supabase implementations of the clause-card and escalation repositories."""

from datetime import UTC, datetime
from uuid import UUID

from supabase import Client

from features.contract_intelligence.models import ClauseCardOut, EscalationOut
from features.demo_mode import DemoFallbackMixin
from shared.supabase_query import first_or_none, run_query


class SupabaseClauseCardRepo(DemoFallbackMixin):
    _fallback_repo_name = "clause_card_repo"

    def __init__(self, client: Client):
        self.client = client

    async def create(self, card: ClauseCardOut) -> ClauseCardOut:
        data = card.model_dump(mode="json", exclude={"id"})
        res = await run_query(self.client.table("clause_cards").insert(data))
        return ClauseCardOut.model_validate(res.data[0])

    async def get(self, id: UUID) -> ClauseCardOut | None:
        res = await run_query(self.client.table("clause_cards").select("*").eq("id", str(id)))
        return first_or_none(ClauseCardOut, res)

    async def list_for_contract(self, contract_id: UUID) -> list[ClauseCardOut]:
        res = await run_query(
            self.client.table("clause_cards").select("*").eq("contract_id", str(contract_id))
        )
        return [ClauseCardOut.model_validate(d) for d in res.data]

    async def update(self, card: ClauseCardOut) -> ClauseCardOut:
        data = card.model_dump(mode="json")
        res = await run_query(self.client.table("clause_cards").update(data).eq("id", str(card.id)))
        return ClauseCardOut.model_validate(res.data[0])

    async def list_for_brand(self, brand_id: UUID) -> list[ClauseCardOut]:
        res = await run_query(
            self.client.table("clause_cards")
            .select("*, contracts!inner(deals!inner(brand_id))")
            .eq("contracts.deals.brand_id", str(brand_id))
        )
        return [
            ClauseCardOut.model_validate({k: v for k, v in d.items() if k != "contracts"})
            for d in res.data
        ]


class SupabaseEscalationRepo(DemoFallbackMixin):
    _fallback_repo_name = "escalation_repo"

    def __init__(self, client: Client):
        self.client = client

    async def create(self, escalation: EscalationOut) -> EscalationOut:
        data = escalation.model_dump(mode="json", exclude={"id"})
        res = await run_query(self.client.table("escalations").insert(data))
        return EscalationOut.model_validate(res.data[0])

    async def get(self, id: UUID) -> EscalationOut | None:
        res = await run_query(self.client.table("escalations").select("*").eq("id", str(id)))
        return first_or_none(EscalationOut, res)

    async def get_open_for_contract(self, contract_id: UUID) -> list[EscalationOut]:
        res = await run_query(
            self.client.table("escalations")
            .select("*")
            .eq("contract_id", str(contract_id))
            .eq("status", "open")
        )
        return [EscalationOut.model_validate(d) for d in res.data]

    async def resolve(self, id: UUID, status: str, resolved_by: UUID, note: str) -> EscalationOut:
        now = datetime.now(UTC).isoformat()
        res = await run_query(
            self.client.table("escalations")
            .update(
                {
                    "status": status,
                    "resolved_by": str(resolved_by),
                    "resolution_note": note,
                    "resolved_at": now,
                }
            )
            .eq("id", str(id))
        )
        return EscalationOut.model_validate(res.data[0])

    async def list_for_brand(self, brand_id: UUID) -> list[EscalationOut]:
        res = await run_query(
            self.client.table("escalations")
            .select("*, contracts!inner(deals!inner(brand_id))")
            .eq("contracts.deals.brand_id", str(brand_id))
        )
        return [
            EscalationOut.model_validate({k: v for k, v in d.items() if k != "contracts"})
            for d in res.data
        ]
