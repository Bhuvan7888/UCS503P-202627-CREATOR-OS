from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException

from application.services.deliverables import DeliverableService
from domain.models.deliverable import (
    Deliverable,
    DeliverableCreateRequest,
    DeliverableStatusUpdateRequest,
)
from features.activity_log import SupabaseActivityLogRepo
from infrastructure.supabase.repos import SupabaseDeliverableRepo
from interface.dependencies import ActorContext, get_current_actor, get_current_brand
from shared.errors import InvalidStatusTransition, PermissionDeniedError
from shared.supabase_client import get_supabase_client

router = APIRouter(tags=["deliverables"])

def get_deliverable_service() -> DeliverableService:
    client = get_supabase_client(service_role=True)
    return DeliverableService(
        deliverable_repo=SupabaseDeliverableRepo(client),
        activity_log_repo=SupabaseActivityLogRepo(client),
    )

@router.get("/deliverables", response_model=list[Deliverable])
async def list_deliverables(
    limit: int = 50,
    offset: int = 0,
    actor: ActorContext = Depends(get_current_actor),
    service: DeliverableService = Depends(get_deliverable_service)
):
    limit = min(limit, 100)
    if actor.actor_type == "creator":
        return await service.list_for_creator(actor.creator_id, limit, offset)
    return await service.list_for_brand(actor.brand_id, limit, offset)

@router.post("/deals/{deal_id}/deliverables", response_model=Deliverable)
async def create_deliverable(
    deal_id: UUID,
    request: DeliverableCreateRequest,
    actor: ActorContext = Depends(get_current_brand),
    service: DeliverableService = Depends(get_deliverable_service)
):
    # Ensure URL deal_id matches body deal_id
    if request.deal_id != deal_id:
        raise HTTPException(status_code=400, detail="Deal ID mismatch")
    return await service.create_deliverable(request, actor.brand_id, actor.actor_id, actor.actor_type)

@router.patch("/deliverables/{id}/status", response_model=Deliverable)
async def update_deliverable_status(
    id: UUID,
    request: DeliverableStatusUpdateRequest,
    deal_id: UUID,
    actor: ActorContext = Depends(get_current_actor),
    service: DeliverableService = Depends(get_deliverable_service)
):
    try:
        return await service.update_status(
            id, request, actor.actor_id, actor.actor_type, actor.brand_id, deal_id, actor.creator_id
        )
    except InvalidStatusTransition as e:
        raise HTTPException(status_code=400, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except PermissionDeniedError as e:
        raise HTTPException(status_code=403, detail=str(e))
