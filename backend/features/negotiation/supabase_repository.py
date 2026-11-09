"""Supabase implementations of the negotiation session and conversation repositories."""

from uuid import UUID

from supabase import Client

from features.demo_mode import DemoFallbackMixin
from features.negotiation.models import (
    ChecklistState,
    NegotiationConversation,
    NegotiationOffer,
    NegotiationSession,
)
from shared.supabase_query import first_or_none, run_query


class SupabaseNegotiationSessionRepo(DemoFallbackMixin):
    _fallback_repo_name = "negotiation_session_repo"

    def __init__(self, client: Client):
        self.client = client

    async def create(self, session: NegotiationSession) -> NegotiationSession:
        data = session.model_dump(mode="json", exclude={"id"})
        res = await run_query(self.client.table("negotiation_sessions").insert(data))
        return NegotiationSession.model_validate(res.data[0])

    async def get(self, id: UUID) -> NegotiationSession | None:
        res = await run_query(
            self.client.table("negotiation_sessions").select("*").eq("id", str(id))
        )
        return first_or_none(NegotiationSession, res)

    async def list_for_brand(
        self, brand_id: UUID, limit: int = 50, offset: int = 0
    ) -> list[NegotiationSession]:
        res = await run_query(
            self.client.table("negotiation_sessions")
            .select("*, deals!inner(brand_id)")
            .eq("deals.brand_id", str(brand_id))
            .order("created_at", desc=True)
            .range(offset, offset + limit - 1)
        )
        return [
            NegotiationSession.model_validate({k: v for k, v in d.items() if k != "deals"})
            for d in res.data
        ]

    async def list_for_creator(
        self, creator_id: UUID, limit: int = 50, offset: int = 0
    ) -> list[NegotiationSession]:
        res = await run_query(
            self.client.table("negotiation_sessions")
            .select("*, deals!inner(creator_id)")
            .eq("deals.creator_id", str(creator_id))
            .order("created_at", desc=True)
            .range(offset, offset + limit - 1)
        )
        return [
            NegotiationSession.model_validate({k: v for k, v in d.items() if k != "deals"})
            for d in res.data
        ]

    async def update_checklist(self, id: UUID, checklist: ChecklistState) -> NegotiationSession:
        res = await run_query(
            self.client.table("negotiation_sessions")
            .update({"checklist": checklist.model_dump()})
            .eq("id", str(id))
        )
        return NegotiationSession.model_validate(res.data[0])

    async def save_offer(self, offer: NegotiationOffer) -> NegotiationOffer:
        data = offer.model_dump(mode="json", exclude={"id"})
        res = await run_query(self.client.table("negotiation_offers").insert(data))
        return NegotiationOffer.model_validate(res.data[0])

    async def list_offers(self, session_id: UUID) -> list[NegotiationOffer]:
        res = await run_query(
            self.client.table("negotiation_offers")
            .select("*")
            .eq("session_id", str(session_id))
            .order("sent_at", desc=False)
        )
        return [NegotiationOffer.model_validate(d) for d in res.data]


class SupabaseNegotiationConversationRepo(DemoFallbackMixin):
    _fallback_repo_name = "negotiation_conv_repo"

    def __init__(self, client: Client):
        self.client = client

    async def create(self, conversation: NegotiationConversation) -> NegotiationConversation:
        res = await run_query(
            self.client.table("negotiation_conversations").insert(
                conversation.model_dump(mode="json", exclude={"id"})
            )
        )
        return NegotiationConversation.model_validate(res.data[0])

    async def list_for_session(self, session_id: UUID) -> list[NegotiationConversation]:
        res = await run_query(
            self.client.table("negotiation_conversations")
            .select("*")
            .eq("session_id", str(session_id))
            .order("created_at", desc=True)
        )
        return [NegotiationConversation.model_validate(d) for d in res.data]
