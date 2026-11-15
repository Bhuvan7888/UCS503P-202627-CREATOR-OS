from fastapi import APIRouter, Depends

from features.auth.dependencies import ActorContext, get_current_brand
from features.brands.models import Brand, BrandProfileUpdate
from features.brands.service import BrandService
from features.brands.supabase_repository import SupabaseBrandRepo
from shared.errors import NotFoundError
from shared.http_errors import map_errors
from shared.supabase_client import get_supabase_client

router = APIRouter(prefix="/brands", tags=["brands"])


def get_brand_service() -> BrandService:
    return BrandService(SupabaseBrandRepo(get_supabase_client(service_role=True)))


@router.get("/me", response_model=Brand)
async def get_my_brand(
    actor: ActorContext = Depends(get_current_brand),
    service: BrandService = Depends(get_brand_service),
):
    with map_errors({NotFoundError: 404}):
        return await service.get(actor.brand_id)


@router.patch("/me", response_model=Brand)
async def update_my_brand(
    request: BrandProfileUpdate,
    actor: ActorContext = Depends(get_current_brand),
    service: BrandService = Depends(get_brand_service),
):
    with map_errors({NotFoundError: 404}):
        return await service.update(actor.brand_id, request)
