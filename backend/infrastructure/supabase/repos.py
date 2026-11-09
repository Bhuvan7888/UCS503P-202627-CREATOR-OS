import asyncio
from uuid import UUID

from supabase import Client

from domain.models.contract import Contract
from domain.models.negotiation import (
    ChecklistState,
    NegotiationConversation,
    NegotiationOffer,
    NegotiationSession,
)
from features.demo_mode import DemoFallbackMixin


class SupabaseContractRepo(DemoFallbackMixin):
    _fallback_repo_name = "contract_repo"
    def __init__(self, client: Client):
        self.client = client
    async def create(self, contract: Contract) -> Contract:
        res = await asyncio.to_thread(lambda: self.client.table("contracts").insert(contract.model_dump(mode="json", exclude={"id"})).execute())
        return Contract.model_validate(res.data[0])
    async def get(self, id: UUID) -> Contract | None:
        res = await asyncio.to_thread(lambda: self.client.table("contracts").select("*").eq("id", str(id)).execute())
        return Contract.model_validate(res.data[0]) if res.data else None
    async def list_for_brand(self, brand_id: UUID, limit: int = 50, offset: int = 0) -> list[Contract]:
        res = (
            await asyncio.to_thread(lambda: self.client.table("contracts").select("*, deals!inner(brand_id)")
            .eq("deals.brand_id", str(brand_id))
            .order("created_at", desc=True).range(offset, offset + limit - 1).execute())
        )
        # Ensure we only return the contract data, stripping the joined deal
        return [Contract.model_validate({k: v for k, v in d.items() if k != 'deals'}) for d in res.data]
    async def list_for_creator(self, creator_id: UUID, limit: int = 50, offset: int = 0) -> list[Contract]:
        linked = (
            await asyncio.to_thread(lambda: self.client.table("contracts").select("*, deals!inner(creator_id)")
            .eq("deals.creator_id", str(creator_id)).execute())
        )
        personal = await asyncio.to_thread(lambda: self.client.table("contracts").select("*").eq("creator_id", str(creator_id)).execute())
        by_id = {d["id"]: {k: v for k, v in d.items() if k != "deals"} for d in linked.data}
        by_id.update({d["id"]: d for d in personal.data})
        merged = sorted(by_id.values(), key=lambda d: d["created_at"], reverse=True)
        return [Contract.model_validate(d) for d in merged[offset:offset + limit]]
    async def update_status(self, id: UUID, status: str) -> Contract:
        res = await asyncio.to_thread(lambda: self.client.table("contracts").update({"status": status}).eq("id", str(id)).execute())
        return Contract.model_validate(res.data[0])
    async def update_status_and_previous(self, id: UUID, status: str, previous_status: str | None) -> Contract:
        res = await asyncio.to_thread(lambda: self.client.table("contracts").update({"status": status, "previous_status": previous_status}).eq("id", str(id)).execute())
        return Contract.model_validate(res.data[0])
    async def update_raw_text(self, id: UUID, raw_text: str) -> Contract:
        res = await asyncio.to_thread(lambda: self.client.table("contracts").update({"raw_text": raw_text}).eq("id", str(id)).execute())
        return Contract.model_validate(res.data[0])
    async def update_creator_status(self, id: UUID, creator_status: str) -> Contract:
        res = await asyncio.to_thread(lambda: self.client.table("contracts").update({"creator_status": creator_status}).eq("id", str(id)).execute())
        return Contract.model_validate(res.data[0])


class SupabaseNegotiationSessionRepo(DemoFallbackMixin):
    _fallback_repo_name = "negotiation_session_repo"
    def __init__(self, client: Client):
        self.client = client
    async def create(self, session: NegotiationSession) -> NegotiationSession:
        data = session.model_dump(mode="json", exclude={"id"})
        res = await asyncio.to_thread(lambda: self.client.table("negotiation_sessions").insert(data).execute())
        return NegotiationSession.model_validate(res.data[0])
    async def get(self, id: UUID) -> NegotiationSession | None:
        res = await asyncio.to_thread(lambda: self.client.table("negotiation_sessions").select("*").eq("id", str(id)).execute())
        return NegotiationSession.model_validate(res.data[0]) if res.data else None
    async def list_for_brand(self, brand_id: UUID, limit: int = 50, offset: int = 0) -> list[NegotiationSession]:
        res = (
            await asyncio.to_thread(lambda: self.client.table("negotiation_sessions")
            .select("*, deals!inner(brand_id)")
            .eq("deals.brand_id", str(brand_id))
            .order("created_at", desc=True).range(offset, offset + limit - 1)
            .execute())
        )
        return [NegotiationSession.model_validate({k: v for k, v in d.items() if k != 'deals'}) for d in res.data]
    async def list_for_creator(self, creator_id: UUID, limit: int = 50, offset: int = 0) -> list[NegotiationSession]:
        res = (
            await asyncio.to_thread(lambda: self.client.table("negotiation_sessions")
            .select("*, deals!inner(creator_id)")
            .eq("deals.creator_id", str(creator_id))
            .order("created_at", desc=True).range(offset, offset + limit - 1)
            .execute())
        )
        return [NegotiationSession.model_validate({k: v for k, v in d.items() if k != 'deals'}) for d in res.data]
    async def update_checklist(self, id: UUID, checklist: ChecklistState) -> NegotiationSession:
        res = await asyncio.to_thread(lambda: self.client.table("negotiation_sessions").update({"checklist": checklist.model_dump()}).eq("id", str(id)).execute())
        return NegotiationSession.model_validate(res.data[0])
    async def save_offer(self, offer: NegotiationOffer) -> NegotiationOffer:
        data = offer.model_dump(mode="json", exclude={"id"})
        res = await asyncio.to_thread(lambda: self.client.table("negotiation_offers").insert(data).execute())
        return NegotiationOffer.model_validate(res.data[0])
    async def list_offers(self, session_id: UUID) -> list[NegotiationOffer]:
        res = (
            await asyncio.to_thread(lambda: self.client.table("negotiation_offers").select("*").eq("session_id", str(session_id))
            .order("sent_at", desc=False).execute())
        )
        return [NegotiationOffer.model_validate(d) for d in res.data]

class SupabaseNegotiationConversationRepo(DemoFallbackMixin):
    _fallback_repo_name = "negotiation_conv_repo"
    def __init__(self, client: Client):
        self.client = client
    async def create(self, conversation: NegotiationConversation) -> NegotiationConversation:
        res = (
            await asyncio.to_thread(lambda: self.client.table("negotiation_conversations")
            .insert(conversation.model_dump(mode="json", exclude={"id"})).execute())
        )
        return NegotiationConversation.model_validate(res.data[0])
    async def list_for_session(self, session_id: UUID) -> list[NegotiationConversation]:
        res = (
            await asyncio.to_thread(lambda: self.client.table("negotiation_conversations").select("*").eq("session_id", str(session_id))
            .order("created_at", desc=True).execute())
        )
        return [NegotiationConversation.model_validate(d) for d in res.data]
