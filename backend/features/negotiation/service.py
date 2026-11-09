from datetime import UTC, datetime
from uuid import UUID, uuid4

from features.activity_log import ActivityLog, ActivityLogRepo
from features.creators import GrowthSnapshotRepo
from features.deals import DealRepo
from features.negotiation.growth_forecast import estimate_weekly_growth_rate
from features.negotiation.models import (
    ChecklistState,
    ForecastPoint,
    NegotiationConversation,
    NegotiationOffer,
    NegotiationSession,
    NegotiationSessionCreate,
)
from features.negotiation.repository import (
    NegotiationConversationRepo,
    NegotiationSessionRepo,
)
from features.negotiation.rules import (
    calculate_base_rate,
    calculate_forecast,
    calculate_range,
    checklist_is_complete,
)
from shared.llm.llm_port import LLMPort

DEFAULT_WEEKLY_GROWTH_RATE = 0.05


class NegotiationService:
    def __init__(
        self,
        session_repo: NegotiationSessionRepo,
        activity_log_repo: ActivityLogRepo,
        llm_port: LLMPort | None = None,
        deal_repo: DealRepo | None = None,
        growth_snapshot_repo: GrowthSnapshotRepo | None = None,
        conversation_repo: NegotiationConversationRepo | None = None,
    ):
        self.session_repo = session_repo
        self.activity_log_repo = activity_log_repo
        self.llm_port = llm_port
        self.deal_repo = deal_repo
        self.growth_snapshot_repo = growth_snapshot_repo
        self.conversation_repo = conversation_repo

    async def create_session(self, request: NegotiationSessionCreate) -> NegotiationSession:
        base_rate = calculate_base_rate(
            request.views_per_week,
            request.niche_cpm,
            request.follower_tier_multiplier,
            request.engagement_rate_adjustment,
        )
        low, high = calculate_range(base_rate)

        session = NegotiationSession(
            id=uuid4(),
            deal_id=request.deal_id,
            status="active",
            views_per_week=request.views_per_week,
            niche_cpm=request.niche_cpm,
            follower_tier_multiplier=request.follower_tier_multiplier,
            engagement_rate_adjustment=request.engagement_rate_adjustment,
            base_rate=base_rate,
            range_low=low,
            range_high=high,
            checklist=ChecklistState(),
            created_at=datetime.now(UTC),
        )
        return await self.session_repo.create(session)

    async def get_forecast(
        self, session_id: UUID, weekly_growth_rate: float | None, weeks: int
    ) -> list[ForecastPoint]:
        session = await self.session_repo.get(session_id)
        if not session:
            raise ValueError("Session not found")

        rate = weekly_growth_rate
        if rate is None:
            rate = DEFAULT_WEEKLY_GROWTH_RATE
            if self.deal_repo and self.growth_snapshot_repo:
                deal = await self.deal_repo.get(session.deal_id)
                if deal:
                    snapshots = await self.growth_snapshot_repo.list_for_creator(deal.creator_id)
                    estimated = estimate_weekly_growth_rate(snapshots)
                    if estimated is not None:
                        rate = estimated

        return calculate_forecast(session.base_rate, rate, weeks)

    async def list_for_brand(
        self, brand_id: UUID, limit: int = 50, offset: int = 0
    ) -> list[NegotiationSession]:
        return await self.session_repo.list_for_brand(brand_id, limit, offset)

    async def list_for_creator(
        self, creator_id: UUID, limit: int = 50, offset: int = 0
    ) -> list[NegotiationSession]:
        return await self.session_repo.list_for_creator(creator_id, limit, offset)

    async def update_checklist(
        self, session_id: UUID, checklist: ChecklistState
    ) -> NegotiationSession:
        return await self.session_repo.update_checklist(session_id, checklist)

    async def create_counter_offer(
        self,
        session_id: UUID,
        amount: float,
        message: str | None,
        actor_id: UUID,
        actor_type: str,
    ) -> NegotiationOffer:
        session = await self.session_repo.get(session_id)
        if not session:
            raise ValueError("Session not found")

        # The checklist protects the creator from sending an incomplete ask —
        # it never gates what the brand offers.
        if actor_type == "creator" and not checklist_is_complete(session.checklist):
            raise ValueError("Checklist is not complete")

        deal = await self.deal_repo.get(session.deal_id)
        brand_id = deal.brand_id if deal else None

        offer = NegotiationOffer(
            id=uuid4(),
            session_id=session_id,
            amount=amount,
            message=message,
            sender=actor_type,
            sent_at=datetime.now(UTC),
        )
        saved = await self.session_repo.save_offer(offer)

        log = ActivityLog(
            id=uuid4(),
            brand_id=brand_id,
            deal_id=session.deal_id,
            actor_type=actor_type,
            actor_label=str(actor_id),
            action="counter_offer_sent",
            metadata={"amount": amount, "message": message, "sender": offer.sender},
            created_at=datetime.now(UTC),
        )
        await self.activity_log_repo.create(log)

        return saved

    async def analyze_conversation(
        self, session_id: UUID, brand_name: str, conversation_text: str
    ) -> NegotiationConversation:
        session = await self.session_repo.get(session_id)
        if not session:
            raise ValueError("Session not found")

        prior = await self.conversation_repo.list_for_session(session_id)
        history = [
            (c.conversation_text, c.ai_suggestion) for c in reversed(prior) if c.ai_suggestion
        ]

        suggestion = await self.llm_port.suggest_negotiation_move(
            session, brand_name, conversation_text, history
        )

        conversation = NegotiationConversation(
            id=uuid4(),
            session_id=session_id,
            brand_name=brand_name,
            conversation_text=conversation_text,
            ai_suggestion=suggestion,
            created_at=datetime.now(UTC),
        )
        return await self.conversation_repo.create(conversation)

    async def list_conversations(self, session_id: UUID) -> list[NegotiationConversation]:
        return await self.conversation_repo.list_for_session(session_id)

    async def list_offers(self, session_id: UUID) -> list[NegotiationOffer]:
        return await self.session_repo.list_offers(session_id)

    async def generate_script(self, session_id: UUID, kind: str) -> str:
        from features.negotiation.rules import generate_script as pure_generate_script

        session = await self.session_repo.get(session_id)
        if not session:
            raise ValueError("Session not found")
        if not checklist_is_complete(session.checklist):
            raise ValueError("Checklist is not complete")
        return pure_generate_script(kind, session)  # type: ignore

    async def generate_script_llm(self, session_id: UUID, kind: str) -> str:
        session = await self.session_repo.get(session_id)
        if not session:
            raise ValueError("Session not found")
        if not checklist_is_complete(session.checklist):
            raise ValueError("Checklist is not complete")

        if not self.llm_port:
            raise ValueError("LLM port not configured")

        return await self.llm_port.draft_script(session, kind)
