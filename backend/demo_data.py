import socket
from datetime import UTC, date, datetime, timedelta
from decimal import Decimal
from urllib.parse import urlparse
from uuid import UUID, uuid4

from config import settings
from domain.models.activity_log import ActivityLog
from domain.models.auth import AuthSession
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

# --- Check Supabase Availability ---
_supabase_available: bool | None = None


def is_demo_mode() -> bool:
    global _supabase_available
    if _supabase_available is not None:
        return not _supabase_available

    # If keys are dummy, treat as demo mode immediately
    if "dummy" in settings.SUPABASE_ANON_KEY.lower() or "dummy" in settings.SUPABASE_SERVICE_ROLE_KEY.lower():
        _supabase_available = False
        return True

    try:
        parsed = urlparse(settings.SUPABASE_URL)
        host = parsed.hostname or "127.0.0.1"
        port = parsed.port or (443 if parsed.scheme == "https" else 80)
        with socket.create_connection((host, port), timeout=0.3):
            _supabase_available = True
            return False
    except Exception:
        _supabase_available = False
        return True


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


# --- Global Demo Store Container ---
class DemoStore:
    def __init__(self):
        self.brand_repo = DemoBrandRepo()
        self.brand_member_repo = DemoBrandMemberRepo()
        self.creator_repo = DemoCreatorRepo()
        self.growth_repo = DemoGrowthSnapshotRepo()
        self.deal_repo = DemoDealRepo()
        self.contract_repo = DemoContractRepo()
        self.deliverable_repo = DemoDeliverableRepo()
        self.activity_log_repo = DemoActivityLogRepo()
        self.payment_repo = DemoPaymentRepo()
        self.negotiation_session_repo = DemoNegotiationSessionRepo()
        self.negotiation_conv_repo = DemoNegotiationConversationRepo()
        self.message_repo = DemoMessageRepo()
        self.benchmark_repo = DemoRateBenchmarkRepo()
        self.clause_card_repo = DemoClauseCardRepo()
        self.escalation_repo = DemoEscalationRepo()
        self._seeded = False

    def seed_if_needed(self):
        if self._seeded:
            return
        self._seeded = True
        _seed_demo_data(self)


store = DemoStore()

# --- Known Demo Accounts Definitions ---
DEMO_BRANDS = {
    "demo.brand1@creatoros.dev": {
        "brand_id": UUID("11111111-1111-1111-1111-111111111111"),
        "user_id": UUID("11111111-1111-1111-1111-111111111112"),
        "name": "Mamaearth",
        "desc": "D2C skincare and personal care brand",
    },
    "demo.brand2@creatoros.dev": {
        "brand_id": UUID("22222222-2222-2222-2222-222222222221"),
        "user_id": UUID("22222222-2222-2222-2222-222222222222"),
        "name": "boAt",
        "desc": "Consumer electronics and audio brand",
    },
    "demo.brand3@creatoros.dev": {
        "brand_id": UUID("33333333-3333-3333-3333-333333333331"),
        "user_id": UUID("33333333-3333-3333-3333-333333333332"),
        "name": "Nykaa",
        "desc": "Beauty and fashion marketplace",
    },
}

DEMO_CREATORS = {
    "demo.creator1@creatoros.dev": {
        "creator_id": UUID("44444444-4444-4444-4444-444444444441"),
        "user_id": UUID("44444444-4444-4444-4444-444444444442"),
        "display_name": "Ananya Sharma",
        "handle": "@ananya.beauty",
        "niche": "beauty",
        "tier": "micro",
        "followers": 68000,
        "engagement": 5.2,
        "views": 21000,
        "brand_id": UUID("11111111-1111-1111-1111-111111111111"),
    },
    "demo.creator2@creatoros.dev": {
        "creator_id": UUID("55555555-5555-5555-5555-555555555551"),
        "user_id": UUID("55555555-5555-5555-5555-555555555552"),
        "display_name": "Rohan Mehta",
        "handle": "@rohan.fit",
        "niche": "fitness",
        "tier": "mid",
        "followers": 145000,
        "engagement": 3.8,
        "views": 48000,
        "brand_id": UUID("11111111-1111-1111-1111-111111111111"),
    },
    "demo.creator3@creatoros.dev": {
        "creator_id": UUID("66666666-6666-6666-6666-666666666661"),
        "user_id": UUID("66666666-6666-6666-6666-666666666662"),
        "display_name": "Zara Khan",
        "handle": "@zara.style",
        "niche": "fashion",
        "tier": "micro",
        "followers": 42000,
        "engagement": 6.1,
        "views": 15000,
        "brand_id": UUID("33333333-3333-3333-3333-333333333331"),
    },
    "demo.creator4@creatoros.dev": {
        "creator_id": UUID("77777777-7777-7777-7777-777777777771"),
        "user_id": UUID("77777777-7777-7777-7777-777777777772"),
        "display_name": "Kabir Anand",
        "handle": "@kabir.tech",
        "niche": "tech",
        "tier": "mid",
        "followers": 112000,
        "engagement": 4.5,
        "views": 27000,
        "brand_id": UUID("22222222-2222-2222-2222-222222222221"),
    },
    "demo.creator5@creatoros.dev": {
        "creator_id": UUID("88888888-8888-8888-8888-888888888881"),
        "user_id": UUID("88888888-8888-8888-8888-888888888882"),
        "display_name": "Ishita Rao",
        "handle": "@ishita.travels",
        "niche": "travel",
        "tier": "micro",
        "followers": 53000,
        "engagement": 5.5,
        "views": 17000,
        "brand_id": UUID("22222222-2222-2222-2222-222222222221"),
    },
}


def authenticate_demo_brand(email: str) -> AuthSession | None:
    store.seed_if_needed()
    info = DEMO_BRANDS.get(email.lower().strip())
    if not info:
        return None
    return AuthSession(
        access_token=f"demo-token-brand-{info['brand_id']}",
        refresh_token=f"demo-refresh-{info['brand_id']}",
        user_id=info["user_id"],
        role="brand",
        brand_id=info["brand_id"],
        brand_name=info["name"],
    )


def authenticate_demo_creator(email: str) -> AuthSession | None:
    store.seed_if_needed()
    info = DEMO_CREATORS.get(email.lower().strip())
    if not info:
        return None
    return AuthSession(
        access_token=f"demo-token-creator-{info['creator_id']}",
        refresh_token=f"demo-refresh-{info['creator_id']}",
        user_id=info["user_id"],
        role="creator",
        brand_id=info["brand_id"],
        creator_id=info["creator_id"],
        display_name=info["display_name"],
    )


def resolve_demo_actor(token: str):
    store.seed_if_needed()
    from interface.dependencies import ActorContext

    # Check brand tokens
    for info in DEMO_BRANDS.values():
        if token in (f"demo-token-brand-{info['brand_id']}", str(info["user_id"])):
            return ActorContext(user_id=info["user_id"], actor_type="brand", brand_id=info["brand_id"])

    # Check creator tokens
    for info in DEMO_CREATORS.values():
        if token in (f"demo-token-creator-{info['creator_id']}", str(info["user_id"])):
            return ActorContext(
                user_id=info["user_id"],
                actor_type="creator",
                brand_id=info["brand_id"],
                creator_id=info["creator_id"],
            )

    return None


def _seed_demo_data(s: DemoStore):
    now = datetime.now(UTC)
    today = date.today()

    # Seed Brands
    for info in DEMO_BRANDS.values():
        b = Brand(
            id=info["brand_id"],
            name=info["name"],
            description=info["desc"],
            gst_number=None,
            pan_number=None,
            created_at=now,
        )
        s.brand_repo.data[b.id] = b
        s.creator_repo.brands[b.id] = b

        m = BrandMember(
            id=uuid4(),
            brand_id=b.id,
            user_id=info["user_id"],
            role="owner",
            created_at=now,
        )
        s.brand_member_repo.data[m.id] = m

    # Seed Creators
    for info in DEMO_CREATORS.values():
        c = Creator(
            id=info["creator_id"],
            brand_id=info["brand_id"],
            user_id=info["user_id"],
            display_name=info["display_name"],
            instagram_handle=info["handle"],
            niche=info["niche"],
            follower_tier=info["tier"],
            followers_count=info["followers"],
            engagement_rate=info["engagement"],
            avg_views_per_week=info["views"],
            created_at=now,
        )
        s.creator_repo.data[c.id] = c
        s.creator_repo.links.add((c.id, info["brand_id"]))

    # Ananya also linked to Nykaa
    ananya_id = DEMO_CREATORS["demo.creator1@creatoros.dev"]["creator_id"]
    nykaa_id = DEMO_BRANDS["demo.brand3@creatoros.dev"]["brand_id"]
    s.creator_repo.links.add((ananya_id, nykaa_id))

    # Helper function to add deals
    def add_deal(
        brand_id: UUID,
        creator_id: UUID,
        campaign: str,
        email: str,
        status: str,
        days_ago: int,
        val: float | None = None,
    ) -> UUID:
        deal_id = uuid4()
        created = now - timedelta(days=days_ago)
        d = Deal(
            id=deal_id,
            brand_id=brand_id,
            creator_id=creator_id,
            campaign_name=campaign,
            contact_email=email,
            status=status,
            value_inr=val,
            brand_viewed_at=created if status != "lead" else None,
            created_at=created,
            updated_at=created,
        )
        s.deal_repo.data[deal_id] = d
        s.contract_repo.deal_brand_map[deal_id] = brand_id
        s.contract_repo.deal_creator_map[deal_id] = creator_id
        s.deliverable_repo.deal_brand_map[deal_id] = brand_id
        s.negotiation_session_repo.deal_brand_map[deal_id] = brand_id
        s.negotiation_session_repo.deal_creator_map[deal_id] = creator_id
        return deal_id

    # 1. Mamaearth deals
    mama_id = DEMO_BRANDS["demo.brand1@creatoros.dev"]["brand_id"]
    rohan_id = DEMO_CREATORS["demo.creator2@creatoros.dev"]["creator_id"]

    d1 = add_deal(mama_id, ananya_id, "Glow Serum Launch", "priya.nair@mamaearth.demo", "completed", 55, 9720.0)
    d2 = add_deal(mama_id, ananya_id, "Winter Skincare Routine", "priya.nair@mamaearth.demo", "negotiating", 6, 5000.0)
    d3 = add_deal(mama_id, rohan_id, "Protein-Infused Face Wash", "priya.nair@mamaearth.demo", "contracted", 28, 12000.0)
    add_deal(mama_id, rohan_id, "Men's Grooming Kit Teaser", "priya.nair@mamaearth.demo", "lead", 2)

    # 2. Nykaa deals
    zara_id = DEMO_CREATORS["demo.creator3@creatoros.dev"]["creator_id"]
    d4 = add_deal(nykaa_id, zara_id, "Festive Fashion Edit", "karan.oberoi@nykaa.demo", "completed", 50, 4920.0)
    d5 = add_deal(nykaa_id, zara_id, "Spring Capsule Wardrobe", "karan.oberoi@nykaa.demo", "negotiating", 5, 3600.0)
    add_deal(nykaa_id, zara_id, "Last Season Denim Push", "karan.oberoi@nykaa.demo", "cancelled", 70)
    d6 = add_deal(nykaa_id, ananya_id, "Beauty Subscription Box Feature", "karan.oberoi@nykaa.demo", "in_production", 15, 6200.0)

    # 3. boAt deals
    boat_id = DEMO_BRANDS["demo.brand2@creatoros.dev"]["brand_id"]
    kabir_id = DEMO_CREATORS["demo.creator4@creatoros.dev"]["creator_id"]
    ishita_id = DEMO_CREATORS["demo.creator5@creatoros.dev"]["creator_id"]

    d7 = add_deal(boat_id, kabir_id, "Wireless Earbuds Review", "arjun.mehra@boat.demo", "completed", 48, 11625.0)
    d8 = add_deal(boat_id, kabir_id, "Smartwatch Launch Teaser", "arjun.mehra@boat.demo", "negotiating", 4, 8000.0)
    d9 = add_deal(boat_id, ishita_id, "Travel Speaker Vlog", "arjun.mehra@boat.demo", "in_production", 20, 6600.0)
    add_deal(boat_id, ishita_id, "Podcast Mic Unboxing", "arjun.mehra@boat.demo", "lead", 1)

    # Deliverables
    def add_deliverable(deal_id: UUID, title: str, desc: str, status: str):
        dev_id = uuid4()
        deliv = Deliverable(
            id=dev_id,
            deal_id=deal_id,
            title=title,
            description=desc,
            status=status,
            created_at=now,
            updated_at=now,
        )
        s.deliverable_repo.data[dev_id] = deliv

    add_deliverable(d1, "Instagram Reel — Glow Serum Launch", "1x 30s Reel + 2 Stories", "approved")
    add_deliverable(d3, "Instagram Reel — Face Wash Launch", "1x Reel, before/after routine", "submitted")
    add_deliverable(d4, "Instagram Reel — Festive Fashion Edit", "3-look styled Reel + shoppable story set", "approved")
    add_deliverable(d6, "Unboxing Reel — Beauty Box", "1x unboxing + haul Reel", "revision_requested")
    add_deliverable(d7, "YouTube Review — Wireless Earbuds", "60-90s review + 1 Reel", "approved")
    add_deliverable(d9, "Travel Vlog — Travel Speaker", "1x destination vlog, 3-5 min", "in_production")

    # Contracts & Payments
    def add_contract_and_payment(
        deal_id: UUID,
        brand_id: UUID,
        amount: float,
        paid: bool,
        raw_text: str | None = None,
        clauses_data: list[tuple[str, str, str, str | None, str | None]] | None = None,
        status_override: str | None = None,
    ) -> UUID:
        cid = uuid4()
        deal = s.deal_repo.data.get(deal_id)
        creator_id = deal.creator_id if deal else None
        contract_status = status_override or ("signed" if paid else "uploaded")

        contract = Contract(
            id=cid,
            deal_id=deal_id,
            creator_id=creator_id,
            status=contract_status,
            previous_status=None,
            s3_path=f"contracts/{deal_id}/demo-agreement.pdf",
            usage_rights_duration_days=60,
            exclusivity_scope="category",
            revision_limit=2,
            payment_timeline_days=30,
            raw_text=raw_text or "BRAND COLLABORATION AGREEMENT - Creator OS Demo",
            creator_status="accepted" if paid else "unread",
            created_at=now,
            updated_at=now,
        )
        s.contract_repo.data[cid] = contract
        s.contract_repo.deal_brand_map[deal_id] = brand_id
        if creator_id:
            s.contract_repo.deal_creator_map[deal_id] = creator_id
            s.contract_repo.contract_creator_map[cid] = creator_id
            s.payment_repo.contract_creator_map[cid] = creator_id
        s.payment_repo.contract_brand_map[cid] = brand_id
        s.clause_card_repo.contract_brand_map[cid] = brand_id

        if clauses_data:
            for ctype, raw_clause, flag, reason, expl in clauses_data:
                card = ClauseCardOut(
                    id=uuid4(),
                    contract_id=cid,
                    clause_type=ctype,
                    raw_text=raw_clause,
                    flag=flag,
                    flag_reason_code=reason,
                    llm_explanation=expl,
                    created_at=now,
                )
                s.clause_card_repo.data[card.id] = card

        pid = uuid4()
        payment = Payment(
            id=pid,
            contract_id=cid,
            amount_inr=Decimal(str(amount)),
            platform_fee_inr=Decimal("0"),
            due_date=today - timedelta(days=10) if paid else today + timedelta(days=15),
            status="paid" if paid else "pending",
            invoice_number=f"INV-{str(pid)[:8].upper()}",
            paid_at=now - timedelta(days=10) if paid else None,
            created_at=now,
            updated_at=now,
        )
        s.payment_repo.data[pid] = payment
        return cid

    mama_ananya_text = """MAMAEARTH INFLUENCER COLLABORATION AGREEMENT
Campaign: Glow Serum Launch

1. DELIVERABLES & SCOPE
Creator agrees to produce and publish 1x 30-second Instagram Reel highlighting the Glow Serum application and 2x Instagram Stories with link stickers.

2. USAGE RIGHTS & LICENSING
Brand is granted non-exclusive commercial digital usage rights for social media channels for a duration of 60 days following publication.

3. REVISIONS POLICY
Creator agrees to provide up to two rounds of reasonable edits prior to final publication.

4. CATEGORY EXCLUSIVITY
Creator agrees not to promote competing vitamin C skincare serums during the active 3-week campaign window.

5. COMPENSATION & PAYMENT TERMS
Brand shall pay the Creator INR 9,720 within 30 days of completion and receipt of invoice."""

    mama_ananya_clauses = [
        ("deliverables", "1. DELIVERABLES & SCOPE\nCreator agrees to produce and publish 1x 30-second Instagram Reel highlighting the Glow Serum application and 2x Instagram Stories with link stickers.", "green", None, None),
        ("usage_rights", "2. USAGE RIGHTS & LICENSING\nBrand is granted non-exclusive commercial digital usage rights for social media channels for a duration of 60 days following publication.", "green", None, None),
        ("revisions", "3. REVISIONS POLICY\nCreator agrees to provide up to two rounds of reasonable edits prior to final publication.", "green", None, None),
        ("exclusivity", "4. CATEGORY EXCLUSIVITY\nCreator agrees not to promote competing vitamin C skincare serums during the active 3-week campaign window.", "green", None, None),
        ("payment_terms", "5. COMPENSATION & PAYMENT TERMS\nBrand shall pay the Creator INR 9,720 within 30 days of completion and receipt of invoice.", "green", None, None),
    ]

    mama_rohan_text = """MAMAEARTH BRAND COLLABORATION AGREEMENT
Campaign: Protein-Infused Face Wash

1. DELIVERABLES & TIMELINE
Creator shall produce 1x high-definition Instagram Reel showcasing the Protein-Infused Face Wash routine within 14 days of receiving product samples.

2. USAGE RIGHTS & PERPETUITY
Brand is granted irrevocable, worldwide, perpetual usage rights to the deliverables across all digital channels, paid ads, and third-party media platforms without any additional royalty fees.

3. REVISIONS & EDITING COMMITMENT
Creator agrees to provide unlimited revisions to the produced video assets until complete brand satisfaction is achieved, at no extra cost.

4. EXCLUSIVITY
Creator shall not promote or endorse competing men's grooming or skincare brands for a period of 30 days following publication.

5. COMPENSATION & TERMS
Brand agrees to pay the Creator a fee of INR 12,000 within 30 days of deliverable approval and invoice receipt."""

    mama_rohan_clauses = [
        ("deliverables", "1. DELIVERABLES & TIMELINE\nCreator shall produce 1x high-definition Instagram Reel showcasing the Protein-Infused Face Wash routine within 14 days of receiving product samples.", "green", None, None),
        ("usage_rights", "2. USAGE RIGHTS & PERPETUITY\nBrand is granted irrevocable, worldwide, perpetual usage rights to the deliverables across all digital channels, paid ads, and third-party media platforms without any additional royalty fees.", "red", "perpetual_usage_rights", "Brand acquires perpetual rights to use your content and likeness forever across all media without additional compensation or expiration date."),
        ("revisions", "3. REVISIONS & EDITING COMMITMENT\nCreator agrees to provide unlimited revisions to the produced video assets until complete brand satisfaction is achieved, at no extra cost.", "red", "unlimited_revisions", "Demanding unlimited revisions exposes the creator to endless rounds of rework and reshoots without compensating for additional time or effort."),
        ("exclusivity", "4. EXCLUSIVITY\nCreator shall not promote or endorse competing men's grooming or skincare brands for a period of 30 days following publication.", "green", None, None),
        ("payment_terms", "5. COMPENSATION & TERMS\nBrand agrees to pay the Creator a fee of INR 12,000 within 30 days of deliverable approval and invoice receipt.", "green", None, None),
    ]

    nykaa_ananya_text = """NYKAA BEAUTY COLLABORATION AGREEMENT
Campaign: Beauty Subscription Box Feature

1. SCOPE OF DELIVERABLES
Creator will post 1x unboxing video and haul review on Instagram showcasing the featured subscription items.

2. WHITELISTING & BOOSTING
Brand reserves the right to run unpaid whitelisting/boosting ads through Creator's account without supplementary compensation.

3. REVISIONS
Creator shall provide standard revisions within 48 hours of draft submission.

4. COMPENSATION
Creator shall receive INR 6,200 upon satisfactory completion of deliverables."""

    nykaa_ananya_clauses = [
        ("deliverables", "1. SCOPE OF DELIVERABLES\nCreator will post 1x unboxing video and haul review on Instagram showcasing the featured subscription items.", "green", None, None),
        ("usage_rights", "2. WHITELISTING & BOOSTING\nBrand reserves the right to run unpaid whitelisting/boosting ads through Creator's account without supplementary compensation.", "red", "unpaid_whitelisting", "Allows the brand to run paid ads and boosting through your creator account handle without paying a whitelisting access fee."),
        ("revisions", "3. REVISIONS\nCreator shall provide standard revisions within 48 hours of draft submission.", "green", None, None),
        ("payment_terms", "4. COMPENSATION\nCreator shall receive INR 6,200 upon satisfactory completion of deliverables.", "green", None, None),
    ]

    add_contract_and_payment(d1, mama_id, 9720.0, True, raw_text=mama_ananya_text, clauses_data=mama_ananya_clauses)
    add_contract_and_payment(d3, mama_id, 12000.0, False, raw_text=mama_rohan_text, clauses_data=mama_rohan_clauses)
    add_contract_and_payment(d4, nykaa_id, 4920.0, True, raw_text="NYKAA FASHION COLLABORATION AGREEMENT\n1. DELIVERABLES: 3-look styled Reel.\n2. USAGE RIGHTS: 45 days.\n3. REVISIONS: Up to 2 rounds.\n4. COMPENSATION: INR 4,920.", clauses_data=[("deliverables", "1. DELIVERABLES: 3-look styled Reel.", "green", None, None), ("usage_rights", "2. USAGE RIGHTS: 45 days.", "green", None, None), ("revisions", "3. REVISIONS: Up to 2 rounds.", "green", None, None), ("payment_terms", "4. COMPENSATION: INR 4,920.", "green", None, None)])
    add_contract_and_payment(d6, nykaa_id, 6200.0, False, raw_text=nykaa_ananya_text, clauses_data=nykaa_ananya_clauses)
    add_contract_and_payment(d7, boat_id, 11625.0, True, raw_text="BOAT DIGITAL CREATOR AGREEMENT\n1. DELIVERABLES: 60-90s dedicated YouTube review and 1 Instagram Reel.\n2. USAGE RIGHTS: 90 days digital license.\n3. REVISIONS: 1 round.\n4. COMPENSATION: INR 11,625.", clauses_data=[("deliverables", "1. DELIVERABLES: 60-90s dedicated YouTube review and 1 Instagram Reel.", "green", None, None), ("usage_rights", "2. USAGE RIGHTS: 90 days digital license.", "green", None, None), ("revisions", "3. REVISIONS: 1 round.", "green", None, None), ("payment_terms", "4. COMPENSATION: INR 11,625.", "green", None, None)])
    add_contract_and_payment(d9, boat_id, 6600.0, False, raw_text="BOAT ADVENTURE COLLABORATION AGREEMENT\n1. DELIVERABLES: 1x destination vlog integration (3-5 minutes).\n2. USAGE RIGHTS: 60 days digital usage.\n3. REVISIONS: Up to 2 revisions.\n4. COMPENSATION: INR 6,600.", clauses_data=[("deliverables", "1. DELIVERABLES: 1x destination vlog integration (3-5 minutes).", "green", None, None), ("usage_rights", "2. USAGE RIGHTS: 60 days digital usage.", "green", None, None), ("revisions", "3. REVISIONS: Up to 2 revisions.", "green", None, None), ("payment_terms", "4. COMPENSATION: INR 6,600.", "green", None, None)])

    # Growth Snapshots for creators
    for c_id, base_f in [
        (ananya_id, 68000),
        (rohan_id, 145000),
        (zara_id, 42000),
        (kabir_id, 112000),
        (ishita_id, 53000),
    ]:
        for w in (8, 4, 0):
            gs_id = uuid4()
            snap = GrowthSnapshot(
                id=gs_id,
                creator_id=c_id,
                recorded_at=today - timedelta(weeks=w),
                followers_count=int(base_f * (1 - 0.01 * w)),
                engagement_rate=5.0,
                created_at=now,
            )
            s.growth_repo.data[gs_id] = snap

    # Negotiation sessions
    def add_negotiation(deal_id: UUID, base: float):
        sid = uuid4()
        session = NegotiationSession(
            id=sid,
            deal_id=deal_id,
            status="active",
            views_per_week=20000,
            niche_cpm=35.0,
            follower_tier_multiplier=5000.0,
            engagement_rate_adjustment=2500.0,
            base_rate=base,
            range_low=round(base * 0.85, 2),
            range_high=round(base * 1.25, 2),
            checklist=ChecklistState(
                usage_rights_duration_set=True,
                exclusivity_scope_set=True,
                revision_limit_set=True,
                payment_timeline_set=True,
            ),
            created_at=now,
        )
        s.negotiation_session_repo.data[sid] = session

    add_negotiation(d1, 9720.0)
    add_negotiation(d2, 5000.0)
    add_negotiation(d4, 4920.0)
    add_negotiation(d7, 11625.0)

    # Messages
    def add_msg(b_id: UUID, c_id: UUID, sender: str, text: str):
        mid = uuid4()
        msg = Message(
            id=mid,
            brand_id=b_id,
            creator_id=c_id,
            sender_type=sender,
            body=text,
            created_at=now,
        )
        s.message_repo.data[mid] = msg

    add_msg(mama_id, ananya_id, "brand", "Hi Ananya! Loved the Glow Serum Reel — engagement has been great.")
    add_msg(mama_id, ananya_id, "creator", "Thank you! Really happy with how it turned out.")
    add_msg(mama_id, rohan_id, "brand", "Hey Rohan, let us know when the travel vlog draft is ready!")
    add_msg(nykaa_id, zara_id, "brand", "Hi Zara, the Festive Fashion Edit content is live and performing really well!")
    add_msg(boat_id, kabir_id, "brand", "Kabir, the Wireless Earbuds review was fantastic — highest CTR this quarter.")
