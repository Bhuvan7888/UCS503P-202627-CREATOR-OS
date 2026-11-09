from fastapi import APIRouter, Depends

from features.analytics.models import BrandAnalytics
from features.analytics.service import AnalyticsService
from features.auth.dependencies import ActorContext, get_current_brand
from features.contracts.supabase_repository import SupabaseContractRepo
from features.creators.supabase_repository import SupabaseCreatorRepo
from features.deals.supabase_repository import SupabaseDealRepo
from features.payments.supabase_repository import SupabasePaymentRepo
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
