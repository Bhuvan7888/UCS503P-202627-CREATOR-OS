from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException

from features.auth.dependencies import ActorContext, get_current_actor
from features.creators.supabase_repository import SupabaseCreatorRepo
from features.platform_stats.models import CreatorAudience, PlatformStatsSave
from features.platform_stats.service import PlatformStatsService
from features.platform_stats.supabase_repository import SupabasePlatformSnapshotRepo
from shared.errors import NotFoundError
from shared.http_errors import map_errors
from shared.supabase_client import get_supabase_client

router = APIRouter(prefix="/platform-stats", tags=["platform-stats"])


def get_platform_stats_service() -> PlatformStatsService:
    client = get_supabase_client(service_role=True)
    return PlatformStatsService(SupabasePlatformSnapshotRepo(client), SupabaseCreatorRepo(client))


def _creator_id(actor: ActorContext) -> UUID:
    if not actor.creator_id:
        raise HTTPException(status_code=403, detail="This action requires a creator account")
    return actor.creator_id


@router.get("/me", response_model=CreatorAudience)
async def my_audience(
    actor: ActorContext = Depends(get_current_actor),
    service: PlatformStatsService = Depends(get_platform_stats_service),
):
    return await service.audience(_creator_id(actor))


@router.put("/me", response_model=CreatorAudience)
async def update_my_platform_stats(
    request: PlatformStatsSave,
    actor: ActorContext = Depends(get_current_actor),
    service: PlatformStatsService = Depends(get_platform_stats_service),
):
    """Save today's numbers for the platforms given (a second save on the same day replaces them)."""
    with map_errors({NotFoundError: 404}):
        return await service.save_today(_creator_id(actor), request)


@router.get("/creators/{creator_id}", response_model=CreatorAudience)
async def creator_audience(
    creator_id: UUID,
    actor: ActorContext = Depends(get_current_actor),
    service: PlatformStatsService = Depends(get_platform_stats_service),
):
    brand_id = actor.brand_id if actor.actor_type == "brand" else None
    if not await service.can_view(brand_id, actor.creator_id, creator_id):
        raise HTTPException(status_code=403, detail="This creator isn't on your roster")
    return await service.audience(creator_id)
