from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException

from features.activity_log.supabase_repository import SupabaseActivityLogRepo
from features.auth import LinkBrandRequest
from features.auth.dependencies import (
    ActorContext,
    get_current_actor,
    get_current_brand,
)
from features.brands import Brand
from features.brands.supabase_repository import SupabaseBrandRepo
from features.creators.models import (
    Creator,
    CreatorOnboardRequest,
    CreatorProfileUpdateRequest,
    GrowthSnapshot,
    GrowthSnapshotCreateRequest,
)
from features.creators.service import CreatorService
from features.creators.supabase_repository import (
    SupabaseCreatorRepo,
    SupabaseGrowthSnapshotRepo,
)
from shared.errors import ValidationError
from shared.http_errors import map_errors
from shared.pagination import clamp_page_size
from shared.supabase_client import get_supabase_client

router = APIRouter(prefix="/creators", tags=["creators"])


def get_creator_service() -> CreatorService:
    client = get_supabase_client(service_role=True)
    return CreatorService(
        creator_repo=SupabaseCreatorRepo(client),
        activity_log_repo=SupabaseActivityLogRepo(client),
        brand_repo=SupabaseBrandRepo(client),
        growth_snapshot_repo=SupabaseGrowthSnapshotRepo(client),
    )


@router.post("", response_model=Creator)
async def onboard_creator(
    request: CreatorOnboardRequest,
    actor: ActorContext = Depends(get_current_brand),
    service: CreatorService = Depends(get_creator_service),
):
    return await service.onboard_creator(request, actor.brand_id, actor.actor_id, actor.actor_type)


@router.get("", response_model=list[Creator])
async def list_creators(
    limit: int = 50,
    offset: int = 0,
    actor: ActorContext = Depends(get_current_brand),
    service: CreatorService = Depends(get_creator_service),
):
    return await service.list_for_brand(actor.brand_id, clamp_page_size(limit), offset)


@router.patch("/me", response_model=Creator)
async def update_my_profile(
    request: CreatorProfileUpdateRequest,
    actor: ActorContext = Depends(get_current_actor),
    service: CreatorService = Depends(get_creator_service),
):
    if not actor.creator_id:
        raise HTTPException(status_code=403, detail="This action requires a creator account")
    return await service.update_profile(
        actor.creator_id,
        request.followers_count,
        request.engagement_rate,
        request.avg_views_per_week,
    )


@router.get("/me/brands", response_model=list[Brand])
async def list_my_brands(
    actor: ActorContext = Depends(get_current_actor),
    service: CreatorService = Depends(get_creator_service),
):
    if not actor.creator_id:
        raise HTTPException(status_code=403, detail="This action requires a creator account")
    return await service.list_linked_brands(actor.creator_id)


@router.post("/me/link-brand", response_model=Brand)
async def link_brand(
    request: LinkBrandRequest,
    actor: ActorContext = Depends(get_current_actor),
    service: CreatorService = Depends(get_creator_service),
):
    if not actor.creator_id:
        raise HTTPException(status_code=403, detail="This action requires a creator account")
    with map_errors({ValidationError: 400}):
        return await service.link_brand(actor.creator_id, request.invite_code)


@router.post("/me/growth-snapshots", response_model=GrowthSnapshot)
async def add_growth_snapshot(
    request: GrowthSnapshotCreateRequest,
    actor: ActorContext = Depends(get_current_actor),
    service: CreatorService = Depends(get_creator_service),
):
    if not actor.creator_id:
        raise HTTPException(status_code=403, detail="This action requires a creator account")
    return await service.add_growth_snapshot(actor.creator_id, request)


@router.get("/me/growth-snapshots", response_model=list[GrowthSnapshot])
async def list_growth_snapshots(
    actor: ActorContext = Depends(get_current_actor),
    service: CreatorService = Depends(get_creator_service),
):
    if not actor.creator_id:
        raise HTTPException(status_code=403, detail="This action requires a creator account")
    return await service.list_growth_snapshots(actor.creator_id)


@router.get("/{id}", response_model=Creator)
async def get_creator(
    id: UUID,
    actor: ActorContext = Depends(get_current_actor),
    service: CreatorService = Depends(get_creator_service),
):
    creator = await service.creator_repo.get(id)
    if not creator:
        raise HTTPException(status_code=404, detail="Creator not found")
    if actor.actor_type == "creator":
        allowed = creator.id == actor.creator_id
    else:
        allowed = (
            creator.brand_id == actor.brand_id
            or await service.creator_repo.is_linked_to_brand(creator.id, actor.brand_id)
        )
    if not allowed:
        raise HTTPException(status_code=403, detail="This creator isn't on your roster")
    return creator
