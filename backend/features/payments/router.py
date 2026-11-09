from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException

from features.activity_log.supabase_repository import SupabaseActivityLogRepo
from features.payments.models import (
    Payment,
    PaymentCreateRequest,
    PaymentStatusUpdateRequest,
)
from features.payments.service import PaymentService
from features.payments.supabase_repository import SupabasePaymentRepo
from interface.dependencies import ActorContext, get_current_actor, get_current_brand
from shared.errors import InvalidStatusTransition
from shared.supabase_client import get_supabase_client


def get_payment_service() -> PaymentService:
    client = get_supabase_client(service_role=True)
    return PaymentService(
        payment_repo=SupabasePaymentRepo(client),
        activity_log_repo=SupabaseActivityLogRepo(client),
    )

router = APIRouter(prefix="/payments", tags=["Payments"])

@router.post("", response_model=Payment)
async def create_payment(
    request: PaymentCreateRequest,
    deal_id: UUID,
    actor: ActorContext = Depends(get_current_brand),
    service: PaymentService = Depends(get_payment_service)
):
    return await service.create_payment(request, actor.brand_id, actor.actor_id, actor.actor_type, deal_id)

@router.get("", response_model=list[Payment])
async def list_payments(
    limit: int = 50,
    offset: int = 0,
    actor: ActorContext = Depends(get_current_actor),
    service: PaymentService = Depends(get_payment_service)
):
    limit = min(limit, 100)
    if actor.actor_type == "creator":
        return await service.list_for_creator(actor.creator_id, limit, offset)
    return await service.list_for_brand(actor.brand_id, limit, offset)

@router.patch("/{contract_id}/mark-paid", response_model=Payment)
async def mark_paid(
    contract_id: UUID,
    payment_id: UUID,
    deal_id: UUID,
    actor: ActorContext = Depends(get_current_brand),
    service: PaymentService = Depends(get_payment_service)
):
    try:
        return await service.mark_paid(payment_id, actor.brand_id, actor.actor_id, actor.actor_type, deal_id)
    except ValueError as e:
        if str(e) == "Payment not found":
            raise HTTPException(status_code=404, detail=str(e))
        raise HTTPException(status_code=400, detail=str(e))
    except InvalidStatusTransition as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.patch("/{contract_id}/status", response_model=Payment)
async def update_payment_status(
    contract_id: UUID,
    request: PaymentStatusUpdateRequest,
    payment_id: UUID,
    deal_id: UUID,
    actor: ActorContext = Depends(get_current_brand),
    service: PaymentService = Depends(get_payment_service)
):
    try:
        return await service.update_status(
            payment_id, request.status, actor.brand_id, actor.actor_id, actor.actor_type, deal_id
        )
    except ValueError as e:
        if str(e) == "Payment not found":
            raise HTTPException(status_code=404, detail=str(e))
        raise HTTPException(status_code=400, detail=str(e))
    except InvalidStatusTransition as e:
        raise HTTPException(status_code=400, detail=str(e))
