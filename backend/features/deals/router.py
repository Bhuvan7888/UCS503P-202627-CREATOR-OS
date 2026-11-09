from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException

from features.activity_log import SupabaseActivityLogRepo
from features.deals.models import (
    Deal,
    DealCreateRequest,
    DealStatusUpdateRequest,
    WeeklyValuePoint,
)
from features.deals.service import DealService
from features.deals.supabase_repository import SupabaseDealRepo
from infrastructure.supabase.repos import (
    SupabaseCreatorRepo,
    SupabaseNegotiationSessionRepo,
)
from interface.dependencies import ActorContext, get_current_actor
from shared.errors import NotFoundError, PermissionDeniedError
from shared.supabase_client import get_supabase_client

router = APIRouter(prefix="/deals", tags=["deals"])

def get_deal_service() -> DealService:
    client = get_supabase_client(service_role=True)
    return DealService(
        deal_repo=SupabaseDealRepo(client),
        activity_log_repo=SupabaseActivityLogRepo(client),
        negotiation_session_repo=SupabaseNegotiationSessionRepo(client),
    )

@router.post("", response_model=Deal)
async def create_deal(
    request: DealCreateRequest,
    actor: ActorContext = Depends(get_current_actor),
    service: DealService = Depends(get_deal_service)
):
    if actor.actor_type == "creator":
        # A creator can either name one of their linked brands, or leave
        # brand_id unset to track their own project with no brand attached.
        if request.brand_id:
            creator_repo = SupabaseCreatorRepo(get_supabase_client(service_role=True))
            if not await creator_repo.is_linked_to_brand(actor.creator_id, request.brand_id):
                raise HTTPException(status_code=403, detail="You are not linked to this brand")
        request = request.model_copy(update={"creator_id": actor.creator_id})
        brand_id = request.brand_id
    else:
        brand_id = actor.brand_id
    return await service.create_deal(request, brand_id, actor.actor_id, actor.actor_type)

@router.get("", response_model=list[Deal])
async def list_deals(
    limit: int = 50,
    offset: int = 0,
    actor: ActorContext = Depends(get_current_actor),
    service: DealService = Depends(get_deal_service)
):
    limit = min(limit, 100)
    if actor.actor_type == "creator":
        return await service.list_for_creator(actor.creator_id, limit, offset)
    return await service.list_for_brand(actor.brand_id, limit, offset)

@router.get("/stats")
async def creator_deal_stats(
    actor: ActorContext = Depends(get_current_actor),
    service: DealService = Depends(get_deal_service)
):
    if actor.actor_type != "creator":
        raise HTTPException(status_code=403, detail="Only creators have project stats")
    return await service.get_creator_stats(actor.creator_id)

@router.post("/{id}/view", response_model=Deal)
async def mark_deal_viewed(
    id: UUID,
    actor: ActorContext = Depends(get_current_actor),
    service: DealService = Depends(get_deal_service)
):
    if actor.actor_type != "brand":
        raise HTTPException(status_code=403, detail="Only the owning brand can mark a deal viewed")
    try:
        return await service.mark_viewed(id, actor.brand_id)
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except PermissionDeniedError as e:
        raise HTTPException(status_code=403, detail=str(e))

@router.get("/weekly-value", response_model=list[WeeklyValuePoint])
async def weekly_completed_value(
    weeks: int = 8,
    actor: ActorContext = Depends(get_current_actor),
    service: DealService = Depends(get_deal_service)
):
    actor_id = actor.creator_id if actor.actor_type == "creator" else actor.brand_id
    return await service.get_weekly_completed_value(actor.actor_type, actor_id, min(weeks, 26))

@router.patch("/{id}/status", response_model=Deal)
async def update_deal_status(
    id: UUID,
    request: DealStatusUpdateRequest,
    actor: ActorContext = Depends(get_current_actor),
    service: DealService = Depends(get_deal_service)
):
    try:
        return await service.update_status(
            id, request.status, actor.actor_id, actor.actor_type, actor.brand_id, actor.creator_id
        )
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except PermissionDeniedError as e:
        raise HTTPException(status_code=403, detail=str(e))
