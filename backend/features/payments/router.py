from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException

from features.activity_log.supabase_repository import SupabaseActivityLogRepo
from features.auth.dependencies import (
    ActorContext,
    get_current_actor,
    get_current_brand,
)
from features.contracts.dependencies import load_accessible_contract
from features.payments.models import (
    Payment,
    PaymentCreateRequest,
    PaymentStatusUpdateRequest,
)
from features.payments.service import PaymentService
from features.payments.supabase_repository import SupabasePaymentRepo
from shared.errors import InvalidStatusTransition
from shared.http_errors import map_errors
from shared.pagination import clamp_page_size
from shared.supabase_client import get_supabase_client


def get_payment_service() -> PaymentService:
    client = get_supabase_client(service_role=True)
    return PaymentService(
        payment_repo=SupabasePaymentRepo(client),
        activity_log_repo=SupabaseActivityLogRepo(client),
    )


router = APIRouter(prefix="/payments", tags=["Payments"])


async def _accessible_payment_deal(
    payment_id: UUID, actor: ActorContext, service: PaymentService
) -> UUID:
    """Check the caller may act on the payment (via its contract) and return the payment's deal id.
    The contract_id / deal_id path and query parameters are kept for API compatibility but
    never trusted."""
    payment = await service.payment_repo.get(payment_id)
    if payment is None:
        raise HTTPException(status_code=404, detail="Payment not found")
    contract = await load_accessible_contract(payment.contract_id, actor)
    if contract.deal_id is None:
        raise HTTPException(status_code=403, detail="This payment isn't yours")
    return contract.deal_id


@router.post("", response_model=Payment)
async def create_payment(
    request: PaymentCreateRequest,
    deal_id: UUID,
    actor: ActorContext = Depends(get_current_brand),
    service: PaymentService = Depends(get_payment_service),
):
    contract = await load_accessible_contract(request.contract_id, actor)
    if contract.deal_id != deal_id:
        raise HTTPException(status_code=400, detail="Contract does not belong to this deal")
    return await service.create_payment(
        request, actor.brand_id, actor.actor_id, actor.actor_type, deal_id
    )


@router.get("", response_model=list[Payment])
async def list_payments(
    limit: int = 50,
    offset: int = 0,
    actor: ActorContext = Depends(get_current_actor),
    service: PaymentService = Depends(get_payment_service),
):
    limit = clamp_page_size(limit)
    if actor.actor_type == "creator":
        return await service.list_for_creator(actor.creator_id, limit, offset)
    return await service.list_for_brand(actor.brand_id, limit, offset)


@router.patch("/{contract_id}/mark-paid", response_model=Payment)
async def mark_paid(
    contract_id: UUID,
    payment_id: UUID,
    deal_id: UUID,
    actor: ActorContext = Depends(get_current_brand),
    service: PaymentService = Depends(get_payment_service),
):
    deal_id = await _accessible_payment_deal(payment_id, actor, service)
    with map_errors(
        {ValueError: 400, InvalidStatusTransition: 400}, by_message={"Payment not found": 404}
    ):
        return await service.mark_paid(
            payment_id, actor.brand_id, actor.actor_id, actor.actor_type, deal_id
        )


@router.patch("/{contract_id}/status", response_model=Payment)
async def update_payment_status(
    contract_id: UUID,
    request: PaymentStatusUpdateRequest,
    payment_id: UUID,
    deal_id: UUID,
    actor: ActorContext = Depends(get_current_brand),
    service: PaymentService = Depends(get_payment_service),
):
    deal_id = await _accessible_payment_deal(payment_id, actor, service)
    with map_errors(
        {ValueError: 400, InvalidStatusTransition: 400}, by_message={"Payment not found": 404}
    ):
        return await service.update_status(
            payment_id, request.status, actor.brand_id, actor.actor_id, actor.actor_type, deal_id
        )
