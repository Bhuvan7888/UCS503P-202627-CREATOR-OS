import asyncio
from datetime import UTC, datetime
from uuid import UUID

from supabase import Client

from domain.models.contract_intelligence import ClauseCardOut, EscalationOut
from features.demo_mode import is_demo_mode, store


class _DemoFallbackMixin:
    _fallback_repo_name: str = ""

    def __getattribute__(self, name):
        if not name.startswith("_") and name != "client" and is_demo_mode():
            store.seed_if_needed()
            fb = getattr(store, self._fallback_repo_name, None)
            if fb and hasattr(fb, name):
                return getattr(fb, name)
        return super().__getattribute__(name)


class SupabaseClauseCardRepo(_DemoFallbackMixin):
    _fallback_repo_name = "clause_card_repo"
    def __init__(self, client: Client):
        self.client = client
        
    async def create(self, card: ClauseCardOut) -> ClauseCardOut:
        data = card.model_dump(mode="json", exclude={"id"})
        res = await asyncio.to_thread(lambda: self.client.table("clause_cards").insert(data).execute())
        return ClauseCardOut.model_validate(res.data[0])
        
    async def get(self, id: UUID) -> ClauseCardOut | None:
        res = await asyncio.to_thread(lambda: self.client.table("clause_cards").select("*").eq("id", str(id)).execute())
        return ClauseCardOut.model_validate(res.data[0]) if res.data else None
        
    async def list_for_contract(self, contract_id: UUID) -> list[ClauseCardOut]:
        res = await asyncio.to_thread(lambda: self.client.table("clause_cards").select("*").eq("contract_id", str(contract_id)).execute())
        return [ClauseCardOut.model_validate(d) for d in res.data]

    async def update(self, card: ClauseCardOut) -> ClauseCardOut:
        data = card.model_dump(mode="json")
        res = await asyncio.to_thread(lambda: self.client.table("clause_cards").update(data).eq("id", str(card.id)).execute())
        return ClauseCardOut.model_validate(res.data[0])

    async def list_for_brand(self, brand_id: UUID) -> list[ClauseCardOut]:
        res = (
            await asyncio.to_thread(lambda: self.client.table("clause_cards").select("*, contracts!inner(deals!inner(brand_id))")
            .eq("contracts.deals.brand_id", str(brand_id)).execute())
        )
        return [ClauseCardOut.model_validate({k: v for k, v in d.items() if k != "contracts"}) for d in res.data]


class SupabaseEscalationRepo(_DemoFallbackMixin):
    _fallback_repo_name = "escalation_repo"
    def __init__(self, client: Client):
        self.client = client
        
    async def create(self, escalation: EscalationOut) -> EscalationOut:
        data = escalation.model_dump(mode="json", exclude={"id"})
        res = await asyncio.to_thread(lambda: self.client.table("escalations").insert(data).execute())
        return EscalationOut.model_validate(res.data[0])
        
    async def get(self, id: UUID) -> EscalationOut | None:
        res = await asyncio.to_thread(lambda: self.client.table("escalations").select("*").eq("id", str(id)).execute())
        return EscalationOut.model_validate(res.data[0]) if res.data else None
        
    async def get_open_for_contract(self, contract_id: UUID) -> list[EscalationOut]:
        res = await asyncio.to_thread(lambda: self.client.table("escalations").select("*").eq("contract_id", str(contract_id)).eq("status", "open").execute())
        return [EscalationOut.model_validate(d) for d in res.data]
        
    async def resolve(self, id: UUID, status: str, resolved_by: UUID, note: str) -> EscalationOut:
        now = datetime.now(UTC).isoformat()
        res = await asyncio.to_thread(lambda: self.client.table("escalations").update({
            "status": status,
            "resolved_by": str(resolved_by),
            "resolution_note": note,
            "resolved_at": now
        }).eq("id", str(id)).execute())
        return EscalationOut.model_validate(res.data[0])

    async def list_for_brand(self, brand_id: UUID) -> list[EscalationOut]:
        res = (
            await asyncio.to_thread(lambda: self.client.table("escalations").select("*, contracts!inner(deals!inner(brand_id))")
            .eq("contracts.deals.brand_id", str(brand_id)).execute())
        )
        return [EscalationOut.model_validate({k: v for k, v in d.items() if k != "contracts"}) for d in res.data]
