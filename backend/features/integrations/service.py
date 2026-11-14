import json
import logging
import secrets
import time
from collections.abc import Callable
from datetime import UTC, datetime
from typing import Any
from uuid import UUID, uuid4

import httpx

from features.integrations.models import (
    ApiKey,
    ApiKeyCreate,
    ApiKeyCreated,
    WebhookDelivery,
    WebhookEndpoint,
    WebhookEndpointCreate,
    WebhookEndpointCreated,
)
from features.integrations.repository import ApiKeyRepo, WebhookRepo
from features.integrations.rules import (
    DELIVERY_LEASE,
    DELIVERY_TIMEOUT_SECONDS,
    hash_secret,
    is_public_https_url,
    new_api_key,
    next_retry,
    sign,
)
from shared.errors import NotFoundError, ValidationError

logger = logging.getLogger(__name__)
RECENT_DELIVERIES = 20
# per-process cache of each workspace's endpoints (cleared here on add/delete; other processes see changes
# within ENDPOINT_CACHE_SECONDS)
ENDPOINT_CACHE_SECONDS = 30
_endpoint_cache: dict[UUID, tuple[list[WebhookEndpoint], float]] = {}
CLAIM_BATCH = 50


class IntegrationsService:
    """API keys (agents acting in one workspace) and signed outgoing webhooks."""

    def __init__(
        self,
        key_repo: ApiKeyRepo,
        webhook_repo: WebhookRepo,
        http_client: Callable[[], httpx.AsyncClient] = lambda: httpx.AsyncClient(
            timeout=DELIVERY_TIMEOUT_SECONDS, follow_redirects=False
        ),
        url_is_safe: Callable[[str], bool] = is_public_https_url,
    ):
        self.key_repo = key_repo
        self.webhook_repo = webhook_repo
        self.http_client = http_client
        self.url_is_safe = url_is_safe

    # --- API keys ----------------------------------------------------------------------------
    async def create_key(
        self, workspace_id: UUID, user_id: UUID, request: ApiKeyCreate
    ) -> ApiKeyCreated:
        prefix, secret = new_api_key()
        key = await self.key_repo.create(
            ApiKey(
                id=uuid4(),
                workspace_id=workspace_id,
                name=request.name.strip(),
                prefix=prefix,
                scopes=list(dict.fromkeys(request.scopes)),
                created_by=user_id,
                created_at=datetime.now(UTC),
            ),
            hash_secret(secret),
        )
        return ApiKeyCreated(key=key, secret=secret)

    async def list_keys(self, workspace_id: UUID) -> list[ApiKey]:
        return await self.key_repo.list_for_workspace(workspace_id)

    async def revoke_key(self, workspace_id: UUID, key_id: UUID) -> None:
        if not any(k.id == key_id for k in await self.key_repo.list_for_workspace(workspace_id)):
            raise NotFoundError("API key not found")
        await self.key_repo.update(key_id, {"revoked_at": datetime.now(UTC)})

    async def resolve_key(self, secret: str) -> ApiKey | None:
        """The live key for this bearer secret (revoked keys stop working immediately)."""
        key = await self.key_repo.get_by_hash(hash_secret(secret))
        if key is None or key.revoked_at is not None:
            return None
        await self.key_repo.update(key.id, {"last_used_at": datetime.now(UTC)})
        return key

    # --- webhook endpoints -------------------------------------------------------------------
    async def create_endpoint(
        self, workspace_id: UUID, request: WebhookEndpointCreate
    ) -> WebhookEndpointCreated:
        if not self.url_is_safe(request.url):
            raise ValidationError("The URL must be https and publicly reachable")
        secret = f"whsec_{secrets.token_urlsafe(32)}"
        endpoint = await self.webhook_repo.create_endpoint(
            WebhookEndpoint(
                id=uuid4(),
                workspace_id=workspace_id,
                url=request.url,
                events=list(dict.fromkeys(request.events)),
                created_at=datetime.now(UTC),
            ),
            secret,
        )
        _endpoint_cache.pop(workspace_id, None)
        return WebhookEndpointCreated(endpoint=endpoint, secret=secret)

    async def list_endpoints(self, workspace_id: UUID) -> list[WebhookEndpoint]:
        return await self.webhook_repo.list_endpoints(workspace_id)

    async def _endpoint(self, workspace_id: UUID, endpoint_id: UUID) -> WebhookEndpoint:
        endpoint = await self.webhook_repo.get_endpoint(endpoint_id)
        if endpoint is None or endpoint.workspace_id != workspace_id:
            raise NotFoundError("Endpoint not found")
        return endpoint

    async def _endpoints_cached(self, workspace_id: UUID) -> list[WebhookEndpoint]:
        """Most workspaces have no endpoints; don't ask the database on every event."""
        found = _endpoint_cache.get(workspace_id)
        if found and found[1] > time.monotonic():
            return found[0]
        endpoints = await self.webhook_repo.list_endpoints(workspace_id)
        _endpoint_cache[workspace_id] = (endpoints, time.monotonic() + ENDPOINT_CACHE_SECONDS)
        return endpoints

    async def delete_endpoint(self, workspace_id: UUID, endpoint_id: UUID) -> None:
        await self._endpoint(workspace_id, endpoint_id)
        await self.webhook_repo.delete_endpoint(endpoint_id)
        _endpoint_cache.pop(workspace_id, None)

    async def deliveries(self, workspace_id: UUID, endpoint_id: UUID) -> list[WebhookDelivery]:
        await self._endpoint(workspace_id, endpoint_id)
        return await self.webhook_repo.recent_deliveries(endpoint_id, RECENT_DELIVERIES)

    async def send_test(self, workspace_id: UUID, endpoint_id: UUID) -> WebhookDelivery:
        endpoint = await self._endpoint(workspace_id, endpoint_id)
        delivery = self._delivery(
            endpoint, "webhook.test", workspace_id, {"message": "Hello from Creator OS"}
        )
        await self.webhook_repo.add_deliveries([delivery])
        return await self.deliver(delivery)

    # --- events ------------------------------------------------------------------------------
    async def emit(
        self, workspace_id: UUID, event: str, data: dict[str, Any]
    ) -> list[WebhookDelivery]:
        """Queue `event` for every endpoint subscribed to it (empty subscription = all events)."""
        queued = [
            self._delivery(e, event, workspace_id, data)
            for e in await self._endpoints_cached(workspace_id)
            if not e.events or event in e.events
        ]
        if queued:
            await self.webhook_repo.add_deliveries(queued)
        return queued

    def _delivery(
        self, endpoint: WebhookEndpoint, event: str, workspace_id: UUID, data: dict[str, Any]
    ) -> WebhookDelivery:
        now = datetime.now(UTC)
        delivery_id = uuid4()
        return WebhookDelivery(
            id=delivery_id,
            endpoint_id=endpoint.id,
            event=event,
            payload={
                "id": str(delivery_id),
                "event": event,
                "workspace_id": str(workspace_id),
                "created_at": now.isoformat(),
                "data": data,
            },
            next_attempt_at=now,
            created_at=now,
        )

    async def deliver(self, delivery: WebhookDelivery) -> WebhookDelivery:
        """One attempt. 2xx = delivered; otherwise schedule a retry, or give up after ~15 hours."""
        endpoint = await self.webhook_repo.get_endpoint(delivery.endpoint_id)
        secret = await self.webhook_repo.get_secret(delivery.endpoint_id)
        status_code: int | None = None
        if (
            endpoint and secret and self.url_is_safe(endpoint.url)
        ):  # re-checked: DNS may have changed
            body = json.dumps(delivery.payload, separators=(",", ":")).encode()
            timestamp = str(int(datetime.now(UTC).timestamp()))
            try:
                async with self.http_client() as http:
                    res = await http.post(
                        endpoint.url,
                        content=body,
                        headers={
                            "Content-Type": "application/json",
                            "User-Agent": "CreatorOS-Webhooks/1.0",
                            "X-CreatorOS-Event": delivery.event,
                            "X-CreatorOS-Delivery": str(delivery.id),
                            "X-CreatorOS-Timestamp": timestamp,
                            "X-CreatorOS-Signature": sign(secret, timestamp, body),
                        },
                    )
                status_code = res.status_code
            except httpx.HTTPError as e:
                logger.info("Webhook delivery %s failed: %s", delivery.id, e)
        attempts = delivery.attempts + 1
        changes: dict[str, Any] = {"attempts": attempts, "last_status_code": status_code}
        if status_code is not None and 200 <= status_code < 300:
            changes["status"] = "delivered"
        else:
            delay = next_retry(attempts)
            changes |= (
                {"status": "pending", "next_attempt_at": datetime.now(UTC) + delay}
                if delay
                else {"status": "failed"}
            )
        await self.webhook_repo.update_delivery(delivery.id, changes)
        return delivery.model_copy(update=changes)

    async def process_due(self) -> int:
        """Send every due delivery once; called by the background loop."""
        now = datetime.now(UTC)
        due = await self.webhook_repo.claim_due(now, now + DELIVERY_LEASE, CLAIM_BATCH)
        for delivery in due:
            await self.deliver(delivery)
        return len(due)
