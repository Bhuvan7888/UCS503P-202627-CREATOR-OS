import logging
from datetime import UTC, datetime
from uuid import UUID, uuid4

from features.ai_assist.models import (
    AiKnowledge,
    AiKnowledgeSave,
    GenerateRequest,
    GenerateResult,
    Suggestion,
    SuggestionDraft,
    SuggestionSet,
)
from features.ai_assist.repository import KnowledgeRepo, SuggestionRepo
from features.ai_assist.rules import (
    RECENT_TITLES_FOR_CONTEXT,
    SUGGESTION_COUNT,
    RateLimiter,
    clean_generated,
    generate_prompt,
    is_fresh,
    suggestions_prompt,
)
from features.content import ContentRepo
from shared.errors import NotFoundError, ValidationError
from shared.llm.llm_port import LLMPort

logger = logging.getLogger(__name__)


class AIUnavailableError(Exception):
    """No AI provider configured, or the provider failed."""

    def __init__(self, message: str = "AI is temporarily unavailable. Try again in a moment."):
        super().__init__(message)


class RateLimitedError(Exception):
    """Too many AI calls for this workspace in the current window."""

    def __init__(
        self, message: str = "Too many AI requests for this workspace. Try again in a few minutes."
    ):
        super().__init__(message)


class AiAssistService:
    def __init__(
        self,
        knowledge_repo: KnowledgeRepo,
        suggestion_repo: SuggestionRepo,
        content_repo: ContentRepo,
        llm: LLMPort | None,
        limiter: RateLimiter,
    ):
        self.knowledge_repo = knowledge_repo
        self.suggestion_repo = suggestion_repo
        self.content_repo = content_repo
        self.llm = llm
        self.limiter = limiter

    async def get_knowledge(self, workspace_id: UUID) -> AiKnowledge:
        return await self.knowledge_repo.get(workspace_id) or AiKnowledge(workspace_id=workspace_id)

    async def save_knowledge(self, workspace_id: UUID, request: AiKnowledgeSave) -> AiKnowledge:
        return await self.knowledge_repo.upsert(
            AiKnowledge(
                workspace_id=workspace_id, **request.model_dump(), updated_at=datetime.now(UTC)
            )
        )

    async def generate(self, workspace_id: UUID, request: GenerateRequest) -> GenerateResult:
        if request.field == "outline" and not request.draft.title.strip():
            raise ValidationError("Add a title before generating an outline")
        llm = self._take_call(workspace_id)
        prompt = generate_prompt(
            request.field, request.draft, await self.knowledge_repo.get(workspace_id)
        )
        try:
            text = await llm.write(prompt)
        except Exception as e:
            logger.warning("AI generate failed: %s", e)
            raise AIUnavailableError from e
        return GenerateResult(text=clean_generated(text, request.field))

    async def suggestions(self, workspace_id: UUID) -> SuggestionSet:
        stored = await self.suggestion_repo.get(workspace_id)
        if stored and is_fresh(stored.generated_at, datetime.now(UTC)):
            return stored
        return SuggestionSet(workspace_id=workspace_id)

    async def refresh_suggestions(self, workspace_id: UUID) -> SuggestionSet:
        llm = self._take_call(workspace_id)
        items = await self.content_repo.list_for_workspace(workspace_id, RECENT_TITLES_FOR_CONTEXT)
        prompt = suggestions_prompt(
            await self.knowledge_repo.get(workspace_id), [i.title for i in items]
        )
        try:
            drafts = await llm.write_structured(prompt, list[SuggestionDraft])
        except Exception as e:
            logger.warning("AI suggestions failed: %s", e)
            raise AIUnavailableError from e
        suggestions = [
            Suggestion(id=uuid4().hex, **d.model_dump()) for d in drafts[:SUGGESTION_COUNT]
        ]
        return await self.suggestion_repo.save(
            SuggestionSet(
                workspace_id=workspace_id, suggestions=suggestions, generated_at=datetime.now(UTC)
            )
        )

    async def dismiss(self, workspace_id: UUID, suggestion_id: str) -> SuggestionSet:
        current = await self.suggestions(workspace_id)
        if not any(s.id == suggestion_id for s in current.suggestions):
            raise NotFoundError("Suggestion not found")
        current.suggestions = [
            s.model_copy(update={"dismissed": True}) if s.id == suggestion_id else s
            for s in current.suggestions
        ]
        return await self.suggestion_repo.save(current)

    def _take_call(self, workspace_id: UUID) -> LLMPort:
        if self.llm is None:
            raise AIUnavailableError
        if not self.limiter.allow(workspace_id, datetime.now(UTC)):
            raise RateLimitedError
        return self.llm
