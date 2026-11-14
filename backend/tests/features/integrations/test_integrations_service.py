from datetime import UTC, datetime, timedelta
from uuid import uuid4

import httpx
import pytest

from features.demo_mode.in_memory_repositories import DemoApiKeyRepo, DemoWebhookRepo
from features.integrations.models import WebhookEndpointCreate
from features.integrations.rules import RETRY_BACKOFF
from features.integrations.service import IntegrationsService


def _service(status: int = 500, safe: bool = True):
    calls: list[httpx.Request] = []

    def handler(r: httpx.Request) -> httpx.Response:
        calls.append(r)
        return httpx.Response(status)

    svc = IntegrationsService(
        DemoApiKeyRepo(),
        DemoWebhookRepo(),
        http_client=lambda: httpx.AsyncClient(transport=httpx.MockTransport(handler)),
        url_is_safe=lambda u: safe,
    )
    return svc, calls


@pytest.mark.asyncio
async def test_a_failing_endpoint_is_retried_then_given_up():
    svc, calls = _service(503)
    ws = uuid4()
    await svc.create_endpoint(ws, WebhookEndpointCreate(url="https://hooks.example/x"))
    (delivery,) = await svc.emit(ws, "publish.approved", {"id": "1"})
    for _ in range(len(RETRY_BACKOFF) + 1):
        delivery = await svc.deliver(delivery)
    assert (
        delivery.status == "failed"
        and delivery.attempts == len(RETRY_BACKOFF) + 1
        and len(calls) == len(RETRY_BACKOFF) + 1
    )


@pytest.mark.asyncio
async def test_due_deliveries_are_claimed_once_and_unsafe_urls_never_called():
    svc, calls = _service(200, safe=True)
    ws = uuid4()
    await svc.create_endpoint(ws, WebhookEndpointCreate(url="https://hooks.example/x"))
    await svc.emit(ws, "publish.rejected", {})
    assert await svc.process_due() == 1 and await svc.process_due() == 0 and len(calls) == 1

    svc.url_is_safe = lambda u: False  # e.g. DNS now points at a private address
    (d,) = await svc.emit(ws, "publish.rejected", {})
    d = await svc.deliver(d)
    assert (
        len(calls) == 1
        and d.status == "pending"
        and d.next_attempt_at > datetime.now(UTC) + timedelta(seconds=30)
    )
