from fastapi import APIRouter, Depends

from features.ai_assist.models import (
    AiKnowledge,
    AiKnowledgeSave,
    GenerateRequest,
    GenerateResult,
    SuggestionSet,
)
from features.ai_assist.rules import RateLimiter
from features.ai_assist.service import AiAssistService, AIUnavailableError, RateLimitedError
from features.ai_assist.supabase_repository import SupabaseKnowledgeRepo, SupabaseSuggestionRepo
from features.content.supabase_repository import SupabaseContentRepo
from features.workspaces.dependencies import (
    WorkspaceContext,
    require_permission,
)
from shared.config import settings
from shared.errors import NotFoundError, ValidationError
from shared.http_errors import map_errors
from shared.llm.gemini_adapter import GeminiAdapter
from shared.llm.llm_port import LLMPort
from shared.supabase_client import get_supabase_client

router = APIRouter(prefix="/workspaces/{workspace}", tags=["ai-assist"])

_limiter = RateLimiter()
_AI_ERRORS = {
    NotFoundError: 404,
    ValidationError: 400,
    RateLimitedError: 429,
    AIUnavailableError: 503,
}


def get_llm() -> LLMPort | None:
    key = settings.GEMINI_API_KEY.strip()
    if not key or "dummy" in key.lower() or key.startswith("your-"):
        return None
    return GeminiAdapter()


def get_ai_service(llm: LLMPort | None = Depends(get_llm)) -> AiAssistService:
    client = get_supabase_client(service_role=True)
    return AiAssistService(
        SupabaseKnowledgeRepo(client),
        SupabaseSuggestionRepo(client),
        SupabaseContentRepo(client),
        llm,
        _limiter,
    )


@router.get("/ai-knowledge", response_model=AiKnowledge)
async def get_knowledge(
    ctx: WorkspaceContext = Depends(require_permission("view_settings")),
    service: AiAssistService = Depends(get_ai_service),
):
    return await service.get_knowledge(ctx.workspace.id)


@router.put("/ai-knowledge", response_model=AiKnowledge)
async def save_knowledge(
    request: AiKnowledgeSave,
    ctx: WorkspaceContext = Depends(require_permission("manage_workspace")),
    service: AiAssistService = Depends(get_ai_service),
):
    return await service.save_knowledge(ctx.workspace.id, request)


@router.post("/ai/generate", response_model=GenerateResult)
async def generate(
    request: GenerateRequest,
    ctx: WorkspaceContext = Depends(require_permission("create_content", "edit_scripts")),
    service: AiAssistService = Depends(get_ai_service),
):
    with map_errors(_AI_ERRORS):
        return await service.generate(ctx.workspace.id, request)


@router.get("/ai/suggestions", response_model=SuggestionSet)
async def suggestions(
    ctx: WorkspaceContext = Depends(require_permission("create_content")),
    service: AiAssistService = Depends(get_ai_service),
):
    return await service.suggestions(ctx.workspace.id)


@router.post("/ai/suggestions/refresh", response_model=SuggestionSet)
async def refresh_suggestions(
    ctx: WorkspaceContext = Depends(require_permission("create_content")),
    service: AiAssistService = Depends(get_ai_service),
):
    with map_errors(_AI_ERRORS):
        return await service.refresh_suggestions(ctx.workspace.id)


@router.post("/ai/suggestions/{suggestion_id}/dismiss", response_model=SuggestionSet)
async def dismiss_suggestion(
    suggestion_id: str,
    ctx: WorkspaceContext = Depends(require_permission("create_content")),
    service: AiAssistService = Depends(get_ai_service),
):
    with map_errors(_AI_ERRORS):
        return await service.dismiss(ctx.workspace.id, suggestion_id)
