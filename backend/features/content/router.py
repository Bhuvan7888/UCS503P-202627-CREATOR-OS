from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends

from features.content.models import (
    ContentItem,
    ContentItemCreate,
    ContentItemUpdate,
    ContentScript,
    ContentStats,
    ScriptSave,
)
from features.content.service import ContentService
from features.content.supabase_repository import SupabaseContentRepo, SupabaseScriptRepo
from features.crm.supabase_repository import SupabaseCrmDealRepo
from features.integrations.dependencies import emit_event
from features.workspaces.dependencies import (
    WorkspaceContext,
    require_permission,
    require_workspace_member,
)
from features.workspaces.supabase_repository import SupabaseWorkspaceRepo
from shared.errors import NotFoundError, ValidationError
from shared.http_errors import map_errors
from shared.supabase_client import get_supabase_client

router = APIRouter(prefix="/workspaces/{workspace}/content", tags=["content"])


def get_content_service() -> ContentService:
    client = get_supabase_client(service_role=True)
    return ContentService(
        SupabaseContentRepo(client),
        SupabaseWorkspaceRepo(client),
        SupabaseScriptRepo(client),
        SupabaseCrmDealRepo(client),
    )


@router.get("", response_model=list[ContentItem])
async def list_content(
    ctx: WorkspaceContext = Depends(require_workspace_member),
    service: ContentService = Depends(get_content_service),
):
    return await service.list(ctx.workspace.id)


@router.get("/stats", response_model=ContentStats)
async def content_stats(
    ctx: WorkspaceContext = Depends(require_workspace_member),
    service: ContentService = Depends(get_content_service),
):
    return await service.stats(ctx.workspace.id)


@router.post("", response_model=ContentItem, status_code=201)
async def create_content(
    request: ContentItemCreate,
    ctx: WorkspaceContext = Depends(require_permission("create_content")),
    service: ContentService = Depends(get_content_service),
):
    with map_errors({ValidationError: 400}):
        return await service.create(ctx.workspace.id, ctx.user_id, request)


@router.patch("/{item_id}", response_model=ContentItem)
async def update_content(
    background: BackgroundTasks,
    item_id: UUID,
    request: ContentItemUpdate,
    ctx: WorkspaceContext = Depends(require_permission("create_content", "edit_scripts")),
    service: ContentService = Depends(get_content_service),
):
    with map_errors({NotFoundError: 404, ValidationError: 400}):
        before = await service.get(ctx.workspace.id, item_id)
        item = await service.update(ctx.workspace.id, item_id, request)
    if item.stage != before.stage:
        await emit_event(
            background,
            ctx.workspace.id,
            "content.stage_changed",
            {
                "content_item_id": str(item.id),
                "title": item.title,
                "from": before.stage,
                "to": item.stage,
            },
        )
    return item


@router.get("/{item_id}/script", response_model=ContentScript)
async def get_script(
    item_id: UUID,
    ctx: WorkspaceContext = Depends(require_permission("view_scripts")),
    service: ContentService = Depends(get_content_service),
):
    with map_errors({NotFoundError: 404}):
        return await service.get_script(ctx.workspace.id, item_id)


@router.put("/{item_id}/script", response_model=ContentScript)
async def save_script(
    item_id: UUID,
    request: ScriptSave,
    ctx: WorkspaceContext = Depends(require_permission("edit_scripts")),
    service: ContentService = Depends(get_content_service),
):
    with map_errors({NotFoundError: 404}):
        return await service.save_script(ctx.workspace.id, item_id, ctx.user_id, request.body)
