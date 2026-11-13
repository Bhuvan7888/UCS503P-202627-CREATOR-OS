from datetime import UTC, datetime
from uuid import UUID

from features.activity_log import ActivityLog
from features.brands import Brand, BrandMember
from features.contract_intelligence import ClauseCardOut, EscalationOut
from features.contracts import Contract
from features.creators import Creator
from features.deals import Deal
from features.deliverables import Deliverable
from features.payments import Payment


class FakeBrandRepo:
    def __init__(self):
        self.data: dict[UUID, Brand] = {}

    async def create(self, brand: Brand) -> Brand:
        self.data[brand.id] = brand
        return brand

    async def get(self, id: UUID) -> Brand | None:
        return self.data.get(id)


class FakeBrandMemberRepo:
    def __init__(self):
        self.data: dict[UUID, BrandMember] = {}

    async def create(self, member: BrandMember) -> BrandMember:
        self.data[member.id] = member
        return member

    async def list_for_brand(self, brand_id: UUID) -> list[BrandMember]:
        return [m for m in self.data.values() if m.brand_id == brand_id]

    async def get_by_user_id(self, user_id: UUID) -> BrandMember | None:
        return next((m for m in self.data.values() if m.user_id == user_id), None)


class FakeCreatorRepo:
    def __init__(self):
        self.data: dict[UUID, Creator] = {}
        self.links: set[tuple[UUID, UUID]] = set()
        self.brands: dict[UUID, Brand] = {}

    async def create(self, creator: Creator) -> Creator:
        self.data[creator.id] = creator
        return creator

    async def get(self, id: UUID) -> Creator | None:
        return self.data.get(id)

    async def get_by_user_id(self, user_id: UUID) -> Creator | None:
        return next((c for c in self.data.values() if c.user_id == user_id), None)

    async def list_for_brand(
        self, brand_id: UUID, limit: int = 50, offset: int = 0
    ) -> list[Creator]:
        matches = [
            self.data[cid] for cid, bid in self.links if bid == brand_id and cid in self.data
        ]
        return matches[offset : offset + limit]

    async def link_brand(self, creator_id: UUID, brand_id: UUID) -> None:
        self.links.add((creator_id, brand_id))

    async def is_linked_to_brand(self, creator_id: UUID, brand_id: UUID) -> bool:
        return (creator_id, brand_id) in self.links

    async def list_linked_brands(self, creator_id: UUID) -> list[Brand]:
        return [
            self.brands[bid] for cid, bid in self.links if cid == creator_id and bid in self.brands
        ]


class FakeDealRepo:
    def __init__(self):
        self.data: dict[UUID, Deal] = {}

    async def create(self, deal: Deal) -> Deal:
        self.data[deal.id] = deal
        return deal

    async def get(self, id: UUID) -> Deal | None:
        return self.data.get(id)

    async def list_for_brand(self, brand_id: UUID, limit: int = 50, offset: int = 0) -> list[Deal]:
        matches = [d for d in self.data.values() if d.brand_id == brand_id]
        return matches[offset : offset + limit]

    async def list_for_creator(
        self, creator_id: UUID, limit: int = 50, offset: int = 0
    ) -> list[Deal]:
        matches = [d for d in self.data.values() if d.creator_id == creator_id]
        return matches[offset : offset + limit]

    async def update_status(self, id: UUID, status: str) -> Deal:
        deal = self.data[id]
        deal.status = status
        return deal

    async def mark_viewed(self, id: UUID) -> Deal:
        deal = self.data[id]
        deal.brand_viewed_at = datetime.now(UTC)
        return deal


class FakeContractRepo:
    def __init__(self):
        self.data: dict[UUID, Contract] = {}
        self.deals_data: dict[UUID, UUID] = {}  # mock join deal->brand

    async def create(self, contract: Contract) -> Contract:
        self.data[contract.id] = contract
        return contract

    async def get(self, id: UUID) -> Contract | None:
        return self.data.get(id)

    async def list_for_brand(
        self, brand_id: UUID, limit: int = 50, offset: int = 0
    ) -> list[Contract]:
        matches = [c for c in self.data.values() if self.deals_data.get(c.deal_id) == brand_id]
        return matches[offset : offset + limit]

    async def list_for_creator(
        self, creator_id: UUID, limit: int = 50, offset: int = 0
    ) -> list[Contract]:
        return []

    async def update_status(self, id: UUID, status: str) -> Contract:
        contract = self.data[id]
        contract.status = status
        return contract

    async def update_status_and_previous(
        self, id: UUID, status: str, previous_status: str | None
    ) -> Contract:
        contract = self.data[id]
        contract.status = status
        contract.previous_status = previous_status
        return contract

    async def update_raw_text(self, id: UUID, raw_text: str) -> Contract:
        contract = self.data[id]
        contract.raw_text = raw_text
        return contract


class FakeDeliverableRepo:
    def __init__(self):
        self.data: dict[UUID, Deliverable] = {}
        self.deals_data: dict[UUID, UUID] = {}

    async def create(self, deliverable: Deliverable) -> Deliverable:
        self.data[deliverable.id] = deliverable
        return deliverable

    async def get(self, id: UUID) -> Deliverable | None:
        return self.data.get(id)

    async def list_for_brand(
        self, brand_id: UUID, limit: int = 50, offset: int = 0
    ) -> list[Deliverable]:
        matches = [d for d in self.data.values() if self.deals_data.get(d.deal_id) == brand_id]
        return matches[offset : offset + limit]

    async def list_for_creator(
        self, creator_id: UUID, limit: int = 50, offset: int = 0
    ) -> list[Deliverable]:
        # ponytail: doesn't model deal->creator ownership (deals_data only maps
        # to brand_id) — tests that need real ownership scoping should populate
        # self.data directly with the deliverables that creator owns.
        return list(self.data.values())[offset : offset + limit]

    async def update_status(
        self, id: UUID, status: str, previous_status: str | None = None
    ) -> Deliverable:
        deliverable = self.data[id]
        deliverable.status = status
        deliverable.previous_status = previous_status
        return deliverable


class FakeActivityLogRepo:
    def __init__(self):
        self.data: dict[UUID, ActivityLog] = {}

    async def create(self, log: ActivityLog) -> ActivityLog:
        self.data[log.id] = log
        return log

    async def get(self, id: UUID) -> ActivityLog | None:
        return self.data.get(id)

    async def list_for_brand(
        self, brand_id: UUID, limit: int = 50, offset: int = 0
    ) -> list[ActivityLog]:
        matches = [l for l in self.data.values() if l.brand_id == brand_id]
        return matches[offset : offset + limit]

    async def list_for_deal(
        self, deal_id: UUID, limit: int = 50, offset: int = 0
    ) -> list[ActivityLog]:
        matches = [l for l in self.data.values() if l.deal_id == deal_id]
        return matches[offset : offset + limit]

    async def list_for_creator(
        self, creator_id: UUID, limit: int = 50, offset: int = 0
    ) -> list[ActivityLog]:
        return []


class FakePaymentRepo:
    def __init__(self):
        self.data: dict[UUID, Payment] = {}
        self.contracts_deals_data: dict[UUID, UUID] = {}

    async def create(self, payment: Payment) -> Payment:
        self.data[payment.id] = payment
        return payment

    async def get(self, id: UUID) -> Payment | None:
        return self.data.get(id)

    async def list_for_brand(
        self, brand_id: UUID, limit: int = 50, offset: int = 0
    ) -> list[Payment]:
        matches = [
            p
            for p in self.data.values()
            if self.contracts_deals_data.get(p.contract_id) == brand_id
        ]
        return matches[offset : offset + limit]

    async def list_for_creator(
        self, creator_id: UUID, limit: int = 50, offset: int = 0
    ) -> list[Payment]:
        return []

    async def mark_paid(self, id: UUID, invoice_number: str | None = None) -> Payment:
        payment = self.data[id]
        payment.status = "paid"
        if invoice_number:
            payment.invoice_number = invoice_number
        return payment

    async def update_status(self, id: UUID, status: str) -> Payment:
        payment = self.data[id]
        payment.status = status
        return payment


class FakeEmailPort:
    def __init__(self):
        self.sent_emails = []

    async def send(self, to: str, subject: str, body: str) -> None:
        self.sent_emails.append({"to": to, "subject": subject, "body": body})


class FakeLLMPort:
    def __init__(self, should_fail: bool = False, explanation: str = "This is a fake explanation."):
        self.should_fail = should_fail
        self.explanation = explanation

    async def explain_clause(self, clause_text: str, flag_reason: str | None) -> str:
        if self.should_fail:
            raise Exception("LLM connection failed.")
        return self.explanation

    async def segment_clauses(self, contract_text: str) -> list:
        if self.should_fail:
            raise Exception("LLM connection failed.")
        from features.contract_intelligence import ClauseInput

        return [ClauseInput(clause_type="general", raw_text=contract_text)]

    async def write(self, prompt: str) -> str:
        if self.should_fail:
            raise Exception("LLM connection failed.")
        self.last_prompt = prompt
        return f'"{self.explanation}"'

    async def write_structured(self, prompt: str, schema):
        if self.should_fail:
            raise Exception("LLM connection failed.")
        from features.ai_assist.models import SuggestionDraft

        self.last_prompt = prompt
        return [
            SuggestionDraft(title=f"Idea {n}", description="d", pillar="Edu", hook="h", type="reel")
            for n in range(8)
        ]


class FakeClauseCardRepo:
    def __init__(self):
        self.data: dict[UUID, ClauseCardOut] = {}
        self.contracts_brand_data: dict[UUID, UUID] = {}

    async def create(self, card: ClauseCardOut) -> ClauseCardOut:
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
        return [
            c
            for c in self.data.values()
            if self.contracts_brand_data.get(c.contract_id) == brand_id
        ]


class FakeEscalationRepo:
    def __init__(self):
        self.data: dict[UUID, EscalationOut] = {}
        self.contracts_brand_data: dict[UUID, UUID] = {}

    async def create(self, escalation: EscalationOut) -> EscalationOut:
        self.data[escalation.id] = escalation
        return escalation

    async def get(self, id: UUID) -> EscalationOut | None:
        return self.data.get(id)

    async def get_open_for_contract(self, contract_id: UUID) -> list[EscalationOut]:
        return [
            e for e in self.data.values() if e.contract_id == contract_id and e.status == "open"
        ]

    async def resolve(self, id: UUID, status: str, resolved_by: UUID, note: str) -> EscalationOut:
        from datetime import datetime

        escalation = self.data[id]
        escalation.status = status
        escalation.resolved_by = resolved_by
        escalation.resolution_note = note
        escalation.resolved_at = datetime.now(UTC)
        return escalation

    async def list_for_brand(self, brand_id: UUID) -> list[EscalationOut]:
        return [
            e
            for e in self.data.values()
            if self.contracts_brand_data.get(e.contract_id) == brand_id
        ]
