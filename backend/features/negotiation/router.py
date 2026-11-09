import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException

from features.activity_log.supabase_repository import SupabaseActivityLogRepo
from features.auth.dependencies import ActorContext, get_current_actor
from features.creators.supabase_repository import SupabaseGrowthSnapshotRepo
from features.deals.supabase_repository import SupabaseDealRepo
from features.negotiation.models import (
    ChecklistState,
    CounterOfferRequest,
    ForecastPoint,
    NegotiationConversation,
    NegotiationConversationCreateRequest,
    NegotiationOffer,
    NegotiationSession,
    NegotiationSessionCreate,
    RateRangeOut,
)
from features.negotiation.rules import calculate_range
from features.negotiation.service import NegotiationService
from features.negotiation.supabase_repository import (
    SupabaseNegotiationConversationRepo,
    SupabaseNegotiationSessionRepo,
)
from shared.http_errors import map_errors
from shared.llm.gemini_adapter import GeminiAdapter
from shared.supabase_client import get_supabase_client


def get_negotiation_service() -> NegotiationService:
    client = get_supabase_client(service_role=True)
    return NegotiationService(
        session_repo=SupabaseNegotiationSessionRepo(client),
        activity_log_repo=SupabaseActivityLogRepo(client),
        llm_port=GeminiAdapter(),
        deal_repo=SupabaseDealRepo(client),
        growth_snapshot_repo=SupabaseGrowthSnapshotRepo(client),
        conversation_repo=SupabaseNegotiationConversationRepo(client),
    )

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/negotiation/sessions", tags=["Negotiation"])

@router.post("", response_model=NegotiationSession)
async def create_session(
    request: NegotiationSessionCreate,
    actor: ActorContext = Depends(get_current_actor),
    service: NegotiationService = Depends(get_negotiation_service)
):
    # Either side can set up the rate calculator for a deal, brand or
    # creator (creators need this for their own unlinked projects, which
    # have no brand to ever do it for them) — but only for a deal they
    # actually own.
    deal = await service.deal_repo.get(request.deal_id)
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")
    owns_deal = (
        (actor.actor_type == "brand" and deal.brand_id == actor.brand_id) or
        (actor.actor_type == "creator" and deal.creator_id == actor.creator_id)
    )
    if not owns_deal:
        raise HTTPException(status_code=403, detail="This deal isn't yours")
    return await service.create_session(request)

@router.get("", response_model=list[NegotiationSession])
async def list_sessions(
    limit: int = 50,
    offset: int = 0,
    actor: ActorContext = Depends(get_current_actor),
    service: NegotiationService = Depends(get_negotiation_service)
):
    limit = min(limit, 100)
    if actor.actor_type == "creator":
        return await service.list_for_creator(actor.creator_id, limit, offset)
    return await service.list_for_brand(actor.brand_id, limit, offset)

@router.get("/{id}/rate-range", response_model=RateRangeOut)
async def get_rate_range(
    id: UUID,
    service: NegotiationService = Depends(get_negotiation_service)
):
    session = await service.session_repo.get(id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    low, high = calculate_range(session.base_rate)
    return RateRangeOut(base_rate=session.base_rate, range_low=low, range_high=high)

@router.get("/{id}/forecast", response_model=list[ForecastPoint])
async def get_forecast(
    id: UUID,
    weekly_growth_rate: float | None = None,
    weeks: int = 12,
    service: NegotiationService = Depends(get_negotiation_service)
):
    # weekly_growth_rate omitted => derive it from the creator's real
    # growth-snapshot history instead of a manual assumption (falls back to
    # a default rate if they don't have enough history yet).
    with map_errors({ValueError: 404}):
        return await service.get_forecast(id, weekly_growth_rate, weeks)

@router.patch("/{id}/checklist", response_model=NegotiationSession)
async def update_checklist(
    id: UUID,
    checklist: ChecklistState,
    service: NegotiationService = Depends(get_negotiation_service)
):
    return await service.update_checklist(id, checklist)

@router.post("/{id}/counter-offer", response_model=NegotiationOffer)
async def create_counter_offer(
    id: UUID,
    request: CounterOfferRequest,
    actor: ActorContext = Depends(get_current_actor),
    service: NegotiationService = Depends(get_negotiation_service)
):
    with map_errors({ValueError: 400}, by_message={"Checklist is not complete": 409, "Session not found": 404}):
        return await service.create_counter_offer(
            id, request.amount, request.message, actor.actor_id, actor.actor_type
        )

@router.post("/{id}/conversations", response_model=NegotiationConversation)
async def analyze_conversation(
    id: UUID,
    request: NegotiationConversationCreateRequest,
    actor: ActorContext = Depends(get_current_actor),
    service: NegotiationService = Depends(get_negotiation_service)
):
    if not actor.creator_id:
        raise HTTPException(status_code=403, detail="This action requires a creator account")
    try:
        return await service.analyze_conversation(id, request.brand_name, request.conversation_text)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.exception("Negotiation AI call failed for session %s", id)
        raise HTTPException(
            status_code=503, detail="The AI assistant is temporarily unavailable — try again shortly."
        ) from e

@router.get("/{id}/conversations", response_model=list[NegotiationConversation])
async def list_conversations(
    id: UUID,
    service: NegotiationService = Depends(get_negotiation_service)
):
    return await service.list_conversations(id)

@router.get("/{id}/offers", response_model=list[NegotiationOffer])
async def list_offers(
    id: UUID,
    actor: ActorContext = Depends(get_current_actor),
    service: NegotiationService = Depends(get_negotiation_service)
):
    return await service.list_offers(id)

from features.negotiation.models import ScriptGenerateRequest


@router.post("/{id}/script", response_model=str)
async def generate_script(
    id: UUID,
    request: ScriptGenerateRequest,
    service: NegotiationService = Depends(get_negotiation_service)
):
    with map_errors({ValueError: 400}, by_message={"Checklist is not complete": 409, "Session not found": 404}):
        if request.use_llm:
            return await service.generate_script_llm(id, request.kind)
        else:
            return await service.generate_script(id, request.kind)

