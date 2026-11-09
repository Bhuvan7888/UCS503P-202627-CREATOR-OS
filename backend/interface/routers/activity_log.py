from uuid import UUID

from fastapi import APIRouter, Depends

from application.services.activity_log import ActivityLogService
from domain.models.activity_log import ActivityLog, ActivityLogManualEntryRequest
from infrastructure.supabase.repos import SupabaseActivityLogRepo
from interface.dependencies import ActorContext, get_current_actor
from shared.supabase_client import get_supabase_client

router = APIRouter(prefix="/activity-log", tags=["activity-log"])

def get_activity_log_service() -> ActivityLogService:
    return ActivityLogService(SupabaseActivityLogRepo(get_supabase_client(service_role=True)))

@router.get("", response_model=list[ActivityLog])
async def get_activity_logs(
    deal_id: UUID | None = None,
    limit: int = 50,
    offset: int = 0,
    actor: ActorContext = Depends(get_current_actor),
    service: ActivityLogService = Depends(get_activity_log_service)
):
    limit = min(limit, 100)
    if deal_id:
        return await service.get_logs_for_deal(str(deal_id), limit, offset)
    if actor.actor_type == "creator":
        return await service.get_logs_for_creator(str(actor.creator_id), limit, offset)
    return await service.get_logs_for_brand(str(actor.brand_id), limit, offset)


@router.post("", response_model=ActivityLog, status_code=201)
async def create_manual_activity_log(
    request: ActivityLogManualEntryRequest,
    actor: ActorContext = Depends(get_current_actor),
    service: ActivityLogService = Depends(get_activity_log_service)
):
    return await service.record_action(
        brand_id=str(actor.brand_id),
        actor_type=actor.actor_type,
        actor_label=str(actor.actor_id),
        action=request.action,
        metadata={"note": request.note, "manual": True},
        deal_id=str(request.deal_id) if request.deal_id else None,
    )
