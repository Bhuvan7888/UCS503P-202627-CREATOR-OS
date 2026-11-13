"""Supabase implementation of the publish request repository."""

from typing import Any
from uuid import UUID

from postgrest.exceptions import APIError
from pydantic import TypeAdapter
from supabase import Client

from features.approvals.models import PublishRequest
from features.demo_mode import DemoFallbackMixin
from shared.errors import DuplicateError
from shared.supabase_query import first_or_none, run_query

_UNIQUE_VIOLATION = "23505"
_to_json = TypeAdapter(dict[str, Any])


class SupabasePublishRequestRepo(DemoFallbackMixin):
    _fallback_repo_name = "publish_request_repo"

    def __init__(self, client: Client):
        self.client = client

    async def create(self, request: PublishRequest) -> PublishRequest:
        try:
            res = await run_query(
                self.client.table("publish_requests").insert(request.model_dump(mode="json"))
            )
        except APIError as e:
            if e.code == _UNIQUE_VIOLATION:
                raise DuplicateError("A pending request already exists") from e
            raise
        return PublishRequest.model_validate(res.data[0])

    async def get(self, id: UUID) -> PublishRequest | None:
        res = await run_query(self.client.table("publish_requests").select("*").eq("id", str(id)))
        return first_or_none(PublishRequest, res)

    async def list_for_workspace(self, workspace_id: UUID, limit: int) -> list[PublishRequest]:
        res = await run_query(
            self.client.table("publish_requests")
            .select("*")
            .eq("workspace_id", str(workspace_id))
            .order("created_at", desc=True)
            .limit(limit)
        )
        return [PublishRequest.model_validate(row) for row in res.data]

    async def decide(self, id: UUID, changes: dict[str, Any]) -> PublishRequest | None:
        # the status filter makes the decision atomic: two people deciding at once can't both win
        res = await run_query(
            self.client.table("publish_requests")
            .update(_to_json.dump_python(changes, mode="json"))
            .eq("id", str(id))
            .eq("status", "pending")
        )
        return PublishRequest.model_validate(res.data[0]) if res.data else None
