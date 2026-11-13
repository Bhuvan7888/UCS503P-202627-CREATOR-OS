from uuid import UUID

from fastapi import APIRouter, Depends, Response

from features.brands.supabase_repository import SupabaseBrandRepo
from features.crm.models import CrmDeal, CrmDealCreate, CrmDealUpdate, CrmStats, PlatformDeal
from features.crm.service import CrmService
from features.crm.supabase_repository import SupabaseCrmDealRepo
from features.deals.supabase_repository import SupabaseDealRepo
from features.workspaces.dependencies import WorkspaceContext, require_workspace_member
from shared.errors import NotFoundError, ValidationError
from shared.http_errors import map_errors
from shared.supabase_client import get_supabase_client

router = APIRouter(prefix="/workspaces/{workspace}/crm", tags=["crm"])
_ERRORS: dict[type[Exception], int] = {NotFoundError: 404, ValidationError: 400}


def get_crm_service() -> CrmService:
    client = get_supabase_client(service_role=True)
    return CrmService(
        SupabaseCrmDealRepo(client), SupabaseDealRepo(client), SupabaseBrandRepo(client)
    )


@router.get("/deals", response_model=list[CrmDeal])
async def list_deals(
    ctx: WorkspaceContext = Depends(require_workspace_member),
    service: CrmService = Depends(get_crm_service),
):
    return await service.list_deals(ctx.workspace.id)


@router.get("/stats", response_model=CrmStats)
async def deal_stats(
    ctx: WorkspaceContext = Depends(require_workspace_member),
    service: CrmService = Depends(get_crm_service),
):
    return await service.stats(ctx.workspace.id)


@router.get("/platform-deals", response_model=list[PlatformDeal])
async def platform_deals(
    ctx: WorkspaceContext = Depends(require_workspace_member),
    service: CrmService = Depends(get_crm_service),
):
    return await service.platform_deals(ctx.workspace.creator_id)


@router.post("/deals", response_model=CrmDeal, status_code=201)
async def create_deal(
    request: CrmDealCreate,
    ctx: WorkspaceContext = Depends(require_workspace_member),
    service: CrmService = Depends(get_crm_service),
):
    return await service.create(ctx.workspace.id, ctx.user_id, request)


@router.patch("/deals/{deal_id}", response_model=CrmDeal)
async def update_deal(
    deal_id: UUID,
    request: CrmDealUpdate,
    ctx: WorkspaceContext = Depends(require_workspace_member),
    service: CrmService = Depends(get_crm_service),
):
    with map_errors(_ERRORS):
        return await service.update(ctx.workspace.id, deal_id, request)


@router.delete("/deals/{deal_id}", status_code=204)
async def delete_deal(
    deal_id: UUID,
    ctx: WorkspaceContext = Depends(require_workspace_member),
    service: CrmService = Depends(get_crm_service),
):
    with map_errors(_ERRORS):
        await service.delete(ctx.workspace.id, deal_id)
    return Response(status_code=204)
