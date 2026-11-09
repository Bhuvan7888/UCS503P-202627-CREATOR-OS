"""In-memory repositories backing demo mode (same method signatures as the Supabase repositories)."""

from datetime import UTC, datetime
from uuid import UUID, uuid4

from domain.models.activity_log import ActivityLog
from domain.models.brand import Brand, BrandMember
from domain.models.contract import Contract
from domain.models.contract_intelligence import ClauseCardOut, EscalationOut
from domain.models.creator import Creator, GrowthSnapshot
from domain.models.deal import Deal
from domain.models.deliverable import Deliverable
from domain.models.message import Message
from domain.models.negotiation import (
    ChecklistState,
    NegotiationConversation,
    NegotiationOffer,
    NegotiationSession,
)
from domain.models.payment import Payment


# --- In-Memory Repository Implementations ---
class DemoBrandRepo:
    def __init__(self):
        self.data: dict[UUID, Brand] = {}

    async def create(self, brand: Brand) -> Brand:
        self.data[brand.id] = brand
        return brand

    async def get(self, id: UUID) -> Brand | None:
        return self.data.get(id)


class DemoBrandMemberRepo:
    def __init__(self):
        self.data: dict[UUID, BrandMember] = {}

    async def create(self, member: BrandMember) -> BrandMember:
        self.data[member.id] = member
        return member

    async def list_for_brand(self, brand_id: UUID) -> list[BrandMember]:
        return [m for m in self.data.values() if m.brand_id == brand_id]

    async def get_by_user_id(self, user_id: UUID) -> BrandMember | None:
        return next((m for m in self.data.values() if m.user_id == user_id), None)


class DemoCreatorRepo:
    def __init__(self):
        self.data: dict[UUID, Creator] = {}
        self.links: set[tuple[UUID, UUID]] = set()  # (creator_id, brand_id)
        self.brands: dict[UUID, Brand] = {}

    async def create(self, creator: Creator) -> Creator:
        self.data[creator.id] = creator
        return creator

    async def get(self, id: UUID) -> Creator | None:
        return self.data.get(id)

    async def get_by_user_id(self, user_id: UUID) -> Creator | None:
        return next((c for c in self.data.values() if c.user_id == user_id), None)

    async def list_for_brand(self, brand_id: UUID, limit: int = 50, offset: int = 0) -> list[Creator]:
        matches = [self.data[cid] for cid, bid in self.links if bid == brand_id and cid in self.data]
        return matches[offset : offset + limit]

    async def link_brand(self, creator_id: UUID, brand_id: UUID) -> None:
        self.links.add((creator_id, brand_id))

    async def is_linked_to_brand(self, creator_id: UUID, brand_id: UUID) -> bool:
        return (creator_id, brand_id) in self.links

    async def list_linked_brands(self, creator_id: UUID) -> list[Brand]:
        return [self.brands[bid] for cid, bid in self.links if cid == creator_id and bid in self.brands]

    async def update_profile(
        self,
        id: UUID,
        followers_count: int,
        engagement_rate: float,
        avg_views_per_week: int | None = None,
    ) -> Creator:
        creator = self.data[id]
        creator.followers_count = followers_count
        creator.engagement_rate = engagement_rate
        if avg_views_per_week is not None:
            creator.avg_views_per_week = avg_views_per_week
        return creator


class DemoGrowthSnapshotRepo:
    def __init__(self):
        self.data: dict[UUID, GrowthSnapshot] = {}

    async def create(self, snapshot: GrowthSnapshot) -> GrowthSnapshot:
        self.data[snapshot.id] = snapshot
        return snapshot

    async def list_for_creator(self, creator_id: UUID, limit: int = 60) -> list[GrowthSnapshot]:
        matches = [s for s in self.data.values() if s.creator_id == creator_id]
        matches.sort(key=lambda s: s.recorded_at, reverse=True)
        return matches[:limit]


class DemoDealRepo:
    def __init__(self):
        self.data: dict[UUID, Deal] = {}

    async def create(self, deal: Deal) -> Deal:
        self.data[deal.id] = deal
        return deal

    async def get(self, id: UUID) -> Deal | None:
        return self.data.get(id)

    async def list_for_brand(self, brand_id: UUID, limit: int = 50, offset: int = 0) -> list[Deal]:
        matches = [d for d in self.data.values() if d.brand_id == brand_id]
        matches.sort(key=lambda d: d.created_at, reverse=True)
        return matches[offset : offset + limit]

    async def list_for_creator(self, creator_id: UUID, limit: int = 50, offset: int = 0) -> list[Deal]:
        matches = [d for d in self.data.values() if d.creator_id == creator_id]
        matches.sort(key=lambda d: d.created_at, reverse=True)
        return matches[offset : offset + limit]

    async def update_status(self, id: UUID, status: str) -> Deal:
        deal = self.data[id]
        deal.status = status
        deal.updated_at = datetime.now(UTC)
        return deal

    async def mark_viewed(self, id: UUID) -> Deal:
        deal = self.data[id]
        deal.brand_viewed_at = datetime.now(UTC)
        return deal


class DemoContractRepo:
    def __init__(self):
        self.data: dict[UUID, Contract] = {}
        self.deal_brand_map: dict[UUID, UUID] = {}
        self.deal_creator_map: dict[UUID, UUID] = {}
        self.contract_creator_map: dict[UUID, UUID] = {}

    async def create(self, contract: Contract) -> Contract:
        self.data[contract.id] = contract
        if contract.creator_id:
            self.contract_creator_map[contract.id] = contract.creator_id
        return contract

    async def get(self, id: UUID) -> Contract | None:
        return self.data.get(id)

    async def list_for_brand(self, brand_id: UUID, limit: int = 50, offset: int = 0) -> list[Contract]:
        matches = [c for c in self.data.values() if self.deal_brand_map.get(c.deal_id) == brand_id]
        matches.sort(key=lambda c: c.created_at, reverse=True)
        return matches[offset : offset + limit]

    async def list_for_creator(self, creator_id: UUID, limit: int = 50, offset: int = 0) -> list[Contract]:
        matches = [
            c for c in self.data.values()
            if c.creator_id == creator_id
            or self.deal_creator_map.get(c.deal_id) == creator_id
            or self.contract_creator_map.get(c.id) == creator_id
        ]
        matches.sort(key=lambda c: c.created_at, reverse=True)
        return matches[offset : offset + limit]

    async def update_status(self, id: UUID, status: str) -> Contract:
        contract = self.data[id]
        contract.status = status
        contract.updated_at = datetime.now(UTC)
        return contract

    async def update_status_and_previous(self, id: UUID, status: str, previous_status: str | None) -> Contract:
        contract = self.data[id]
        contract.status = status
        contract.previous_status = previous_status
        contract.updated_at = datetime.now(UTC)
        return contract

    async def update_raw_text(self, id: UUID, raw_text: str) -> Contract:
        contract = self.data[id]
        contract.raw_text = raw_text
        contract.updated_at = datetime.now(UTC)
        return contract

    async def update_creator_status(self, id: UUID, creator_status: str) -> Contract:
        contract = self.data[id]
        contract.creator_status = creator_status
        contract.updated_at = datetime.now(UTC)
        return contract


class DemoDeliverableRepo:
    def __init__(self):
        self.data: dict[UUID, Deliverable] = {}
        self.deal_brand_map: dict[UUID, UUID] = {}

    async def create(self, deliverable: Deliverable) -> Deliverable:
        self.data[deliverable.id] = deliverable
        return deliverable

    async def get(self, id: UUID) -> Deliverable | None:
        return self.data.get(id)

    async def list_for_brand(self, brand_id: UUID, limit: int = 50, offset: int = 0) -> list[Deliverable]:
        matches = [d for d in self.data.values() if self.deal_brand_map.get(d.deal_id) == brand_id]
        return matches[offset : offset + limit]

    async def list_for_creator(self, creator_id: UUID, limit: int = 50, offset: int = 0) -> list[Deliverable]:
        return list(self.data.values())[offset : offset + limit]

    async def update_status(self, id: UUID, status: str, previous_status: str | None = None) -> Deliverable:
        d = self.data[id]
        d.status = status
        d.previous_status = previous_status
        d.updated_at = datetime.now(UTC)
        return d


class DemoActivityLogRepo:
    def __init__(self):
        self.data: dict[UUID, ActivityLog] = {}

    async def create(self, log: ActivityLog) -> ActivityLog:
        self.data[log.id] = log
        return log

    async def get(self, id: UUID) -> ActivityLog | None:
        return self.data.get(id)

    async def list_for_brand(self, brand_id: UUID, limit: int = 50, offset: int = 0) -> list[ActivityLog]:
        matches = [l for l in self.data.values() if l.brand_id == brand_id]
        matches.sort(key=lambda l: l.created_at, reverse=True)
        return matches[offset : offset + limit]

    async def list_for_deal(self, deal_id: UUID, limit: int = 50, offset: int = 0) -> list[ActivityLog]:
        matches = [l for l in self.data.values() if l.deal_id == deal_id]
        matches.sort(key=lambda l: l.created_at, reverse=True)
        return matches[offset : offset + limit]

    async def list_for_creator(self, creator_id: UUID, limit: int = 50, offset: int = 0) -> list[ActivityLog]:
        return []


class DemoPaymentRepo:
    def __init__(self):
        self.data: dict[UUID, Payment] = {}
        self.contract_brand_map: dict[UUID, UUID] = {}
        self.contract_creator_map: dict[UUID, UUID] = {}

    async def create(self, payment: Payment) -> Payment:
        self.data[payment.id] = payment
        return payment

    async def get(self, id: UUID) -> Payment | None:
        return self.data.get(id)

    async def list_for_brand(self, brand_id: UUID, limit: int = 50, offset: int = 0) -> list[Payment]:
        matches = [p for p in self.data.values() if self.contract_brand_map.get(p.contract_id) == brand_id]
        matches.sort(key=lambda p: p.created_at, reverse=True)
        return matches[offset : offset + limit]

    async def list_for_creator(self, creator_id: UUID, limit: int = 50, offset: int = 0) -> list[Payment]:
        matches = [p for p in self.data.values() if self.contract_creator_map.get(p.contract_id) == creator_id]
        matches.sort(key=lambda p: p.created_at, reverse=True)
        return matches[offset : offset + limit]

    async def mark_paid(self, id: UUID, invoice_number: str | None = None) -> Payment:
        payment = self.data[id]
        payment.status = "paid"
        if invoice_number:
            payment.invoice_number = invoice_number
        payment.updated_at = datetime.now(UTC)
        return payment

    async def update_status(self, id: UUID, status: str) -> Payment:
        p = self.data[id]
        p.status = status
        if status == "paid":
            p.paid_at = datetime.now(UTC)
        else:
            p.paid_at = None
        p.updated_at = datetime.now(UTC)
        return p


class DemoNegotiationSessionRepo:
    def __init__(self):
        self.data: dict[UUID, NegotiationSession] = {}
        self.offers: dict[UUID, NegotiationOffer] = {}
        self.deal_brand_map: dict[UUID, UUID] = {}
        self.deal_creator_map: dict[UUID, UUID] = {}

    async def create(self, session: NegotiationSession) -> NegotiationSession:
        self.data[session.id] = session
        return session

    async def get(self, id: UUID) -> NegotiationSession | None:
        return self.data.get(id)

    async def list_for_brand(self, brand_id: UUID, limit: int = 50, offset: int = 0) -> list[NegotiationSession]:
        matches = [s for s in self.data.values() if self.deal_brand_map.get(s.deal_id) == brand_id]
        return matches[offset : offset + limit]

    async def list_for_creator(self, creator_id: UUID, limit: int = 50, offset: int = 0) -> list[NegotiationSession]:
        matches = [s for s in self.data.values() if self.deal_creator_map.get(s.deal_id) == creator_id]
        return matches[offset : offset + limit]

    async def update_checklist(self, id: UUID, checklist: ChecklistState) -> NegotiationSession:
        session = self.data[id]
        session.checklist = checklist
        session.updated_at = datetime.now(UTC)
        return session

    async def save_offer(self, offer: NegotiationOffer) -> NegotiationOffer:
        self.offers[offer.id] = offer
        return offer

    async def list_offers(self, session_id: UUID) -> list[NegotiationOffer]:
        matches = [o for o in self.offers.values() if o.session_id == session_id]
        matches.sort(key=lambda o: o.sent_at)
        return matches


class DemoNegotiationConversationRepo:
    def __init__(self):
        self.data: dict[UUID, NegotiationConversation] = {}

    async def create(self, conv: NegotiationConversation) -> NegotiationConversation:
        self.data[conv.id] = conv
        return conv

    async def list_for_session(self, session_id: UUID) -> list[NegotiationConversation]:
        matches = [c for c in self.data.values() if c.session_id == session_id]
        matches.sort(key=lambda c: c.created_at, reverse=True)
        return matches


class DemoMessageRepo:
    def __init__(self):
        self.data: dict[UUID, Message] = {}

    async def create(self, msg: Message) -> Message:
        self.data[msg.id] = msg
        return msg

    async def list_for_thread(self, brand_id: UUID, creator_id: UUID, limit: int = 200) -> list[Message]:
        matches = [
            m for m in self.data.values() if m.brand_id == brand_id and m.creator_id == creator_id
        ]
        matches.sort(key=lambda m: m.created_at)
        return matches[:limit]

    async def mark_thread_read(self, brand_id: UUID, creator_id: UUID, reader_type: str) -> int:
        now = datetime.now(UTC)
        count = 0
        for m in self.data.values():
            if m.brand_id == brand_id and m.creator_id == creator_id:
                if m.sender_type != reader_type and getattr(m, "read_at", None) is None:
                    m.read_at = now
                    count += 1
        return count

    async def get_unread_count(self, actor_type: str, actor_id: UUID) -> int:
        count = 0
        for m in self.data.values():
            if getattr(m, "read_at", None) is None:
                if actor_type == "brand" and m.brand_id == actor_id and m.sender_type == "creator":
                    count += 1
                elif actor_type == "creator" and m.creator_id == actor_id and m.sender_type == "brand":
                    count += 1
        return count

    async def get_unread_by_contact(self, actor_type: str, actor_id: UUID) -> dict[str, int]:
        counts: dict[str, int] = {}
        for m in self.data.values():
            if getattr(m, "read_at", None) is None:
                if actor_type == "brand" and m.brand_id == actor_id and m.sender_type == "creator":
                    cid = str(m.creator_id)
                    counts[cid] = counts.get(cid, 0) + 1
                elif actor_type == "creator" and m.creator_id == actor_id and m.sender_type == "brand":
                    bid = str(m.brand_id)
                    counts[bid] = counts.get(bid, 0) + 1
        return counts


class DemoRateBenchmarkRepo:
    def __init__(self):
        self.benchmarks: dict[tuple[str, str], list[float]] = {
            ("beauty", "micro"): [8500.0, 9720.0, 11000.0, 12500.0],
            ("fitness", "mid"): [12000.0, 14500.0, 16000.0, 18000.0],
            ("fashion", "micro"): [4200.0, 4920.0, 6000.0, 6600.0],
            ("tech", "mid"): [9900.0, 11625.0, 13500.0, 15500.0],
            ("travel", "micro"): [6600.0, 7500.0, 8500.0, 9500.0],
        }

    async def get_historical_rates(self, niche: str, follower_tier: str) -> list[float]:
        return self.benchmarks.get((niche, follower_tier), [5000.0, 8000.0, 10000.0])


class DemoClauseCardRepo:
    def __init__(self):
        self.data: dict[UUID, ClauseCardOut] = {}
        self.contract_brand_map: dict[UUID, UUID] = {}

    async def create(self, card: ClauseCardOut) -> ClauseCardOut:
        if not card.id or card.id == UUID(int=0):
            card.id = uuid4()
        self.data[card.id] = card
        return card

    async def get(self, id: UUID) -> ClauseCardOut | None:
        return self.data.get(id)

    async def list_for_contract(self, contract_id: UUID) -> list[ClauseCardOut]:
        return [c for c in self.data.values() if c.contract_id == contract_id]

    async def update(self, card: ClauseCardOut) -> ClauseCardOut:
        self.data[card.id] = card
        return card

    async def list_for_brand(self, brand_id: UUID) -> list[ClauseCardOut]:
        return [c for c in self.data.values() if self.contract_brand_map.get(c.contract_id) == brand_id]


class DemoEscalationRepo:
    def __init__(self):
        self.data: dict[UUID, EscalationOut] = {}
        self.contract_brand_map: dict[UUID, UUID] = {}

    async def create(self, esc: EscalationOut) -> EscalationOut:
        self.data[esc.id] = esc
        return esc

    async def get(self, id: UUID) -> EscalationOut | None:
        return self.data.get(id)

    async def get_open_for_contract(self, contract_id: UUID) -> list[EscalationOut]:
        return [e for e in self.data.values() if e.contract_id == contract_id and e.status == "open"]

    async def resolve(self, id: UUID, status: str, resolved_by: UUID, note: str) -> EscalationOut:
        esc = self.data[id]
        esc.status = status
        esc.resolved_by = resolved_by
        esc.resolution_note = note
        esc.resolved_at = datetime.now(UTC)
        return esc

    async def list_for_brand(self, brand_id: UUID) -> list[EscalationOut]:
        return [e for e in self.data.values() if self.contract_brand_map.get(e.contract_id) == brand_id]
