from fastapi import APIRouter, Depends

from application.services.analytics import AnalyticsService
from domain.models.analytics import BrandAnalytics
from infrastructure.supabase.repos import (
    SupabaseContractRepo,
    SupabaseCreatorRepo,
    SupabaseDealRepo,
    SupabasePaymentRepo,
)
from interface.dependencies import ActorContext, get_current_brand
from shared.supabase_client import get_supabase_client

router = APIRouter(prefix="/analytics", tags=["analytics"])


def get_analytics_service() -> AnalyticsService:
    client = get_supabase_client(service_role=True)
    return AnalyticsService(
        deal_repo=SupabaseDealRepo(client),
        creator_repo=SupabaseCreatorRepo(client),
        contract_repo=SupabaseContractRepo(client),
        payment_repo=SupabasePaymentRepo(client),
    )


@router.get("/brand", response_model=BrandAnalytics)
async def get_brand_analytics(
    actor: ActorContext = Depends(get_current_brand),
    service: AnalyticsService = Depends(get_analytics_service),
):
    return await service.get_brand_analytics(actor.brand_id)
