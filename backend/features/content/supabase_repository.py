"""Supabase implementation of the content repository."""

from typing import Any
from uuid import UUID

from pydantic import TypeAdapter
from supabase import Client

from features.content.models import ContentItem, ContentScript
from features.demo_mode import DemoFallbackMixin
from shared.supabase_query import first_or_none, run_query

_to_json = TypeAdapter(dict[str, Any])


class SupabaseContentRepo(DemoFallbackMixin):
    _fallback_repo_name = "content_repo"

    def __init__(self, client: Client):
        self.client = client

    async def create(self, item: ContentItem) -> ContentItem:
        res = await run_query(
            self.client.table("content_items").insert(item.model_dump(mode="json"))
        )
        return ContentItem.model_validate(res.data[0])

    async def get(self, id: UUID) -> ContentItem | None:
        res = await run_query(self.client.table("content_items").select("*").eq("id", str(id)))
        return first_or_none(ContentItem, res)

    async def list_for_workspace(self, workspace_id: UUID, limit: int) -> list[ContentItem]:
        res = await run_query(
            self.client.table("content_items")
            .select("*")
            .eq("workspace_id", str(workspace_id))
            .order("updated_at", desc=True)
            .limit(limit)
        )
        return [ContentItem.model_validate(row) for row in res.data]

    async def update(self, id: UUID, changes: dict[str, Any]) -> ContentItem:
        res = await run_query(
            self.client.table("content_items")
            .update(_to_json.dump_python(changes, mode="json"))
            .eq("id", str(id))
        )
        return ContentItem.model_validate(res.data[0])


class SupabaseScriptRepo(DemoFallbackMixin):
    _fallback_repo_name = "script_repo"

    def __init__(self, client: Client):
        self.client = client

    async def get(self, content_item_id: UUID) -> ContentScript | None:
        res = await run_query(
            self.client.table("content_scripts")
            .select("*")
            .eq("content_item_id", str(content_item_id))
        )
        return first_or_none(ContentScript, res)

    async def upsert(self, script: ContentScript) -> ContentScript:
        res = await run_query(
            self.client.table("content_scripts").upsert(script.model_dump(mode="json"))
        )
        return ContentScript.model_validate(res.data[0])

    async def scripted_item_ids(self, workspace_id: UUID) -> frozenset[UUID]:
        res = await run_query(
            self.client.table("content_scripts")
            .select("content_item_id")
            .eq("workspace_id", str(workspace_id))
            .neq("body", "")
        )
        return frozenset(UUID(row["content_item_id"]) for row in res.data)
