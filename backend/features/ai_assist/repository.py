"""Repository ports for AI assistance."""

from __future__ import annotations

from typing import Protocol, runtime_checkable
from uuid import UUID

from features.ai_assist.models import AiKnowledge, SuggestionSet


@runtime_checkable
class KnowledgeRepo(Protocol):
    async def get(self, workspace_id: UUID) -> AiKnowledge | None: ...
    async def upsert(self, knowledge: AiKnowledge) -> AiKnowledge: ...


@runtime_checkable
class SuggestionRepo(Protocol):
    async def get(self, workspace_id: UUID) -> SuggestionSet | None: ...
    async def save(self, suggestions: SuggestionSet) -> SuggestionSet: ...
