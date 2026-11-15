from uuid import UUID

from fastapi import APIRouter, Depends

from features.ai_assist import AIUnavailableError, RateLimitedError, RateLimiter
from features.auth.dependencies import ActorContext, get_current_brand
from features.brand_ai.models import (
    BrandAiProfile,
    BrandAiProfileSave,
    BriefSave,
    DealBrief,
    GeneratedText,
    MatchRequest,
    MatchResult,
)
from features.brand_ai.service import BrandAiService
from features.brand_ai.supabase_repository import SupabaseBrandAiProfileRepo, SupabaseDealBriefRepo
from features.brands.supabase_repository import SupabaseBrandRepo
from features.creators.supabase_repository import SupabaseCreatorRepo
from features.deals.dependencies import load_accessible_deal
from features.deals.supabase_repository import SupabaseDealRepo
from features.deliverables.supabase_repository import SupabaseDeliverableRepo
from features.messages.supabase_repository import SupabaseMessageRepo
from shared.config import settings
from shared.errors import NotFoundError, ValidationError
from shared.http_errors import map_errors
from shared.llm.factory import make_llm
from shared.llm.llm_port import LLMPort
from shared.supabase_client import get_supabase_client

router = APIRouter(prefix="/brand-ai", tags=["brand-ai"])

_limiter = RateLimiter()
_AI_ERRORS = {
    NotFoundError: 404,
    ValidationError: 400,
    RateLimitedError: 429,
    AIUnavailableError: 503,
}


def get_brand_llm() -> LLMPort | None:
    return make_llm() if settings.ai_configured else None


def get_brand_ai_service(llm: LLMPort | None = Depends(get_brand_llm)) -> BrandAiService:
    client = get_supabase_client(service_role=True)
    return BrandAiService(
        profile_repo=SupabaseBrandAiProfileRepo(client),
        brief_repo=SupabaseDealBriefRepo(client),
        brand_repo=SupabaseBrandRepo(client),
        creator_repo=SupabaseCreatorRepo(client),
        deal_repo=SupabaseDealRepo(client),
        deliverable_repo=SupabaseDeliverableRepo(client),
        message_repo=SupabaseMessageRepo(client),
        llm=llm,
        limiter=_limiter,
    )


@router.get("/profile", response_model=BrandAiProfile)
async def get_profile(
    actor: ActorContext = Depends(get_current_brand),
    service: BrandAiService = Depends(get_brand_ai_service),
):
    return await service.get_profile(actor.brand_id)


@router.put("/profile", response_model=BrandAiProfile)
async def save_profile(
    request: BrandAiProfileSave,
    actor: ActorContext = Depends(get_current_brand),
    service: BrandAiService = Depends(get_brand_ai_service),
):
    return await service.save_profile(actor.brand_id, request)


@router.get("/deals/{deal_id}/brief", response_model=DealBrief | None)
async def get_brief(
    deal_id: UUID,
    actor: ActorContext = Depends(get_current_brand),
    service: BrandAiService = Depends(get_brand_ai_service),
):
    return await service.get_brief(await load_accessible_deal(deal_id, actor))


@router.put("/deals/{deal_id}/brief", response_model=DealBrief)
async def save_brief(
    deal_id: UUID,
    request: BriefSave,
    actor: ActorContext = Depends(get_current_brand),
    service: BrandAiService = Depends(get_brand_ai_service),
):
    return await service.save_brief(await load_accessible_deal(deal_id, actor), request)


@router.post("/deals/{deal_id}/brief/generate", response_model=GeneratedText)
async def generate_brief(
    deal_id: UUID,
    actor: ActorContext = Depends(get_current_brand),
    service: BrandAiService = Depends(get_brand_ai_service),
):
    deal = await load_accessible_deal(deal_id, actor)
    with map_errors(_AI_ERRORS):
        return await service.generate_brief(deal)


@router.post("/match", response_model=MatchResult)
async def match_creators(
    request: MatchRequest,
    actor: ActorContext = Depends(get_current_brand),
    service: BrandAiService = Depends(get_brand_ai_service),
):
    with map_errors(_AI_ERRORS):
        return await service.match(actor.brand_id, request)


@router.post("/chat/{creator_id}/draft", response_model=GeneratedText)
async def draft_reply(
    creator_id: UUID,
    actor: ActorContext = Depends(get_current_brand),
    service: BrandAiService = Depends(get_brand_ai_service),
):
    with map_errors(_AI_ERRORS):
        return await service.draft_reply(actor.brand_id, creator_id)
