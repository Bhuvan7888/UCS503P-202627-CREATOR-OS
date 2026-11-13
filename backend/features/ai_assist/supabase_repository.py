"""Supabase implementation of the AI assistance repositories."""

from uuid import UUID

from supabase import Client

from features.ai_assist.models import AiKnowledge, SuggestionSet
from features.demo_mode import DemoFallbackMixin
from shared.supabase_query import first_or_none, run_query


class SupabaseKnowledgeRepo(DemoFallbackMixin):
    _fallback_repo_name = "knowledge_repo"

    def __init__(self, client: Client):
        self.client = client

    async def get(self, workspace_id: UUID) -> AiKnowledge | None:
        res = await run_query(
            self.client.table("workspace_ai_knowledge")
            .select("*")
            .eq("workspace_id", str(workspace_id))
        )
        return first_or_none(AiKnowledge, res)

    async def upsert(self, knowledge: AiKnowledge) -> AiKnowledge:
        res = await run_query(
            self.client.table("workspace_ai_knowledge").upsert(knowledge.model_dump(mode="json"))
        )
        return AiKnowledge.model_validate(res.data[0])


class SupabaseSuggestionRepo(DemoFallbackMixin):
    _fallback_repo_name = "suggestion_repo"

    def __init__(self, client: Client):
        self.client = client

    async def get(self, workspace_id: UUID) -> SuggestionSet | None:
        res = await run_query(
            self.client.table("ai_suggestions").select("*").eq("workspace_id", str(workspace_id))
        )
        return first_or_none(SuggestionSet, res)

    async def save(self, suggestions: SuggestionSet) -> SuggestionSet:
        res = await run_query(
            self.client.table("ai_suggestions").upsert(suggestions.model_dump(mode="json"))
        )
        return SuggestionSet.model_validate(res.data[0])
