import asyncio
from uuid import UUID

from supabase import Client

from domain.models.contract import Contract
from domain.models.creator import Creator, GrowthSnapshot
from domain.models.negotiation import (
    ChecklistState,
    NegotiationConversation,
    NegotiationOffer,
    NegotiationSession,
)
from features.brands import Brand
from features.demo_mode import DemoFallbackMixin


class SupabaseCreatorRepo(DemoFallbackMixin):
    _fallback_repo_name = "creator_repo"
    def __init__(self, client: Client):
        self.client = client
    async def create(self, creator: Creator) -> Creator:
        res = await asyncio.to_thread(lambda: self.client.table("creators").insert(creator.model_dump(mode="json", exclude={"id"})).execute())
        return Creator.model_validate(res.data[0])
    async def get(self, id: UUID) -> Creator | None:
        res = await asyncio.to_thread(lambda: self.client.table("creators").select("*").eq("id", str(id)).execute())
        return Creator.model_validate(res.data[0]) if res.data else None
    async def list_for_brand(self, brand_id: UUID, limit: int = 50, offset: int = 0) -> list[Creator]:
        res = (
            await asyncio.to_thread(lambda: self.client.table("creator_brand_links").select("creators(*)")
            .eq("brand_id", str(brand_id))
            .order("linked_at", desc=True).range(offset, offset + limit - 1).execute())
        )
        return [Creator.model_validate(d["creators"]) for d in res.data if d.get("creators")]
    async def get_by_user_id(self, user_id: UUID) -> Creator | None:
        res = await asyncio.to_thread(lambda: self.client.table("creators").select("*").eq("user_id", str(user_id)).execute())
        return Creator.model_validate(res.data[0]) if res.data else None
    async def update_profile(
        self, id: UUID, followers_count: int, engagement_rate: float,
        avg_views_per_week: int | None = None,
    ) -> Creator:
        update_data = {"followers_count": followers_count, "engagement_rate": engagement_rate}
        if avg_views_per_week is not None:
            update_data["avg_views_per_week"] = avg_views_per_week
        res = await asyncio.to_thread(lambda: self.client.table("creators").update(update_data).eq("id", str(id)).execute())
        return Creator.model_validate(res.data[0])
    async def link_brand(self, creator_id: UUID, brand_id: UUID) -> None:
        if await self.is_linked_to_brand(creator_id, brand_id):
            return
        await asyncio.to_thread(lambda: self.client.table("creator_brand_links").insert(
            {"creator_id": str(creator_id), "brand_id": str(brand_id)}
        ).execute())
    async def is_linked_to_brand(self, creator_id: UUID, brand_id: UUID) -> bool:
        res = (
            await asyncio.to_thread(lambda: self.client.table("creator_brand_links").select("id")
            .eq("creator_id", str(creator_id)).eq("brand_id", str(brand_id)).execute())
        )
        return bool(res.data)
    async def list_linked_brands(self, creator_id: UUID) -> list[Brand]:
        res = (
            await asyncio.to_thread(lambda: self.client.table("creator_brand_links").select("brands(*)")
            .eq("creator_id", str(creator_id)).order("linked_at", desc=True).execute())
        )
        return [Brand.model_validate(d["brands"]) for d in res.data if d.get("brands")]

class SupabaseGrowthSnapshotRepo(DemoFallbackMixin):
    _fallback_repo_name = "growth_repo"
    def __init__(self, client: Client):
        self.client = client
    async def create(self, snapshot: GrowthSnapshot) -> GrowthSnapshot:
        res = (
            await asyncio.to_thread(lambda: self.client.table("growth_snapshots")
            .upsert(snapshot.model_dump(mode="json", exclude={"id"}), on_conflict="creator_id,recorded_at")
            .execute())
        )
        return GrowthSnapshot.model_validate(res.data[0])
    async def list_for_creator(self, creator_id: UUID, limit: int = 60) -> list[GrowthSnapshot]:
        res = (
            await asyncio.to_thread(lambda: self.client.table("growth_snapshots").select("*").eq("creator_id", str(creator_id))
            .order("recorded_at", desc=True).limit(limit).execute())
        )
        return [GrowthSnapshot.model_validate(d) for d in res.data]


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
