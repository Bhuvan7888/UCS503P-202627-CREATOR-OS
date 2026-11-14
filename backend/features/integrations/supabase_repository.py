"""Supabase implementation of the API key and webhook repositories."""

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import TypeAdapter
from supabase import Client

from features.demo_mode import DemoFallbackMixin
from features.integrations.models import ApiKey, WebhookDelivery, WebhookEndpoint
from shared.supabase_query import first_or_none, run_query

_to_json = TypeAdapter(dict[str, Any])
_KEY_COLUMNS = (
    "id, workspace_id, name, prefix, scopes, created_by, created_at, last_used_at, revoked_at"
)
_ENDPOINT_COLUMNS = "id, workspace_id, url, events, created_at"


class SupabaseApiKeyRepo(DemoFallbackMixin):
    _fallback_repo_name = "api_key_repo"

    def __init__(self, client: Client):
        self.client = client

    async def create(self, key: ApiKey, key_hash: str) -> ApiKey:
        await run_query(
            self.client.table("api_keys").insert(
                {**key.model_dump(mode="json"), "key_hash": key_hash}
            )
        )
        return key

    async def get_by_hash(self, key_hash: str) -> ApiKey | None:
        res = await run_query(
            self.client.table("api_keys").select(_KEY_COLUMNS).eq("key_hash", key_hash)
        )
        return first_or_none(ApiKey, res)

    async def list_for_workspace(self, workspace_id: UUID) -> list[ApiKey]:
        res = await run_query(
            self.client.table("api_keys")
            .select(_KEY_COLUMNS)
            .eq("workspace_id", str(workspace_id))
            .order("created_at", desc=True)
        )
        return [ApiKey.model_validate(r) for r in res.data]

    async def update(self, id: UUID, changes: dict[str, Any]) -> None:
        await run_query(
            self.client.table("api_keys")
            .update(_to_json.dump_python(changes, mode="json"))
            .eq("id", str(id))
        )


class SupabaseWebhookRepo(DemoFallbackMixin):
    _fallback_repo_name = "webhook_repo"

    def __init__(self, client: Client):
        self.client = client

    async def create_endpoint(self, endpoint: WebhookEndpoint, secret: str) -> WebhookEndpoint:
        await run_query(
            self.client.table("webhook_endpoints").insert(
                {**endpoint.model_dump(mode="json"), "secret": secret}
            )
        )
        return endpoint

    async def list_endpoints(self, workspace_id: UUID) -> list[WebhookEndpoint]:
        res = await run_query(
            self.client.table("webhook_endpoints")
            .select(_ENDPOINT_COLUMNS)
            .eq("workspace_id", str(workspace_id))
            .order("created_at")
        )
        return [WebhookEndpoint.model_validate(r) for r in res.data]

    async def get_endpoint(self, endpoint_id: UUID) -> WebhookEndpoint | None:
        res = await run_query(
            self.client.table("webhook_endpoints")
            .select(_ENDPOINT_COLUMNS)
            .eq("id", str(endpoint_id))
        )
        return first_or_none(WebhookEndpoint, res)

    async def get_secret(self, endpoint_id: UUID) -> str | None:
        res = await run_query(
            self.client.table("webhook_endpoints").select("secret").eq("id", str(endpoint_id))
        )
        return res.data[0]["secret"] if res.data else None

    async def delete_endpoint(self, endpoint_id: UUID) -> None:
        await run_query(self.client.table("webhook_endpoints").delete().eq("id", str(endpoint_id)))

    async def add_deliveries(self, deliveries: list[WebhookDelivery]) -> None:
        await run_query(
            self.client.table("webhook_deliveries").insert(
                [d.model_dump(mode="json") for d in deliveries]
            )
        )

    async def recent_deliveries(self, endpoint_id: UUID, limit: int) -> list[WebhookDelivery]:
        res = await run_query(
            self.client.table("webhook_deliveries")
            .select("*")
            .eq("endpoint_id", str(endpoint_id))
            .order("created_at", desc=True)
            .limit(limit)
        )
        return [WebhookDelivery.model_validate(r) for r in res.data]

    async def claim_due(
        self, now: datetime, lease_until: datetime, limit: int
    ) -> list[WebhookDelivery]:
        res = await run_query(
            self.client.table("webhook_deliveries")
            .select("id")
            .in_("status", ["pending", "sending"])
            .lte("next_attempt_at", now.isoformat())
            .order("next_attempt_at")
            .limit(limit)
        )
        claimed: list[WebhookDelivery] = []
        for row in res.data:
            # the time condition makes the claim atomic: only one worker's update matches
            won = await run_query(
                self.client.table("webhook_deliveries")
                .update({"status": "sending", "next_attempt_at": lease_until.isoformat()})
                .eq("id", row["id"])
                .lte("next_attempt_at", now.isoformat())
            )
            claimed += [WebhookDelivery.model_validate(r) for r in won.data]
        return claimed

    async def update_delivery(self, id: UUID, changes: dict[str, Any]) -> None:
        await run_query(
            self.client.table("webhook_deliveries")
            .update(_to_json.dump_python(changes, mode="json"))
            .eq("id", str(id))
        )
