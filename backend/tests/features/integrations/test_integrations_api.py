import hashlib
import hmac
import json

import httpx
import pytest
from fastapi.testclient import TestClient

import features.demo_mode.mode as demo_mode_switch
from features.demo_mode import DEMO_PASSWORD
from features.integrations.dependencies import get_integrations_service
from features.integrations.service import IntegrationsService
from features.integrations.supabase_repository import SupabaseApiKeyRepo, SupabaseWebhookRepo
from main import app
from shared.config import settings
from shared.supabase_client import get_supabase_client

client = TestClient(app)


@pytest.fixture
def received(monkeypatch: pytest.MonkeyPatch):
    """Demo mode + a fake receiving endpoint: requests are captured, and /fail answers 500."""
    monkeypatch.setattr(demo_mode_switch, "_supabase_available", False)
    monkeypatch.setattr(settings, "ENVIRONMENT", "development")
    got: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        got.append(request)
        return httpx.Response(500 if request.url.path == "/fail" else 200)

    def service() -> IntegrationsService:
        db = get_supabase_client(service_role=True)
        return IntegrationsService(
            SupabaseApiKeyRepo(db),
            SupabaseWebhookRepo(db),
            http_client=lambda: httpx.AsyncClient(transport=httpx.MockTransport(handler)),
            url_is_safe=lambda url: url.startswith("https://"),
        )

    app.dependency_overrides[get_integrations_service] = service
    import features.integrations.dependencies as deps

    monkeypatch.setattr(deps, "get_integrations_service", service)  # emit_event builds its own
    yield got
    app.dependency_overrides.pop(get_integrations_service, None)


def _login(email: str) -> tuple[dict[str, str], str]:
    r = client.post("/auth/creator/login", json={"email": email, "password": DEMO_PASSWORD})
    h = {"Authorization": f"Bearer {r.json()['access_token']}"}
    return h, "/workspaces/" + client.get("/workspaces", headers=h).json()[0]["slug"]


def _key(
    owner: dict[str, str], w: str, scopes: list[str], name: str = "Hermes agent"
) -> dict[str, str]:
    made = client.post(f"{w}/api-keys", headers=owner, json={"name": name, "scopes": scopes})
    assert made.status_code == 201
    return {"Authorization": f"Bearer {made.json()['secret']}"}


def test_api_key_scopes_agent_publish_and_revoke(received: list[httpx.Request]) -> None:
    owner, w = _login("demo.creator4@creatoros.dev")
    _, other_w = _login("demo.creator5@creatoros.dev")
    reader = _key(owner, w, ["content:read"], "Reader")
    agent = _key(owner, w, ["content:write", "publish:write"])

    listed = client.get(f"{w}/api-keys", headers=owner).json()
    assert {k["name"] for k in listed} >= {"Reader", "Hermes agent"} and "secret" not in listed[0]

    assert client.get(f"{w}/content", headers=reader).status_code == 200
    assert (
        client.post(
            f"{w}/content", headers=reader, json={"title": "t", "pillar": "p", "hook": "h"}
        ).status_code
        == 403
    )
    item = client.post(
        f"{w}/content", headers=agent, json={"title": "From agent", "pillar": "p", "hook": "h"}
    )
    assert item.status_code == 201

    req = client.post(
        f"{w}/approvals", headers=agent, json={"content_item_id": item.json()["id"]}
    ).json()
    assert (req["source"], req["agent_name"], req["status"]) == ("agent", "Hermes agent", "pending")
    assert (
        client.post(f"{w}/approvals/{req['id']}/approve", headers=agent).status_code == 403
    )  # people only

    # keys never manage keys, the team or the CRM; and only reach their own workspace
    assert client.get(f"{w}/api-keys", headers=agent).status_code == 403
    assert (
        client.post(
            f"{w}/invites", headers=agent, json={"email": "a@b.co", "role": "script_writer"}
        ).status_code
        == 403
    )
    assert client.get(f"{w}/crm/deals", headers=agent).status_code == 403
    assert client.get(f"{other_w}/content", headers=agent).status_code == 403
    assert client.get("/workspaces", headers=agent).status_code == 401

    log = client.get(f"{w}/audit-log", headers=owner).json()
    assert any(
        e["actor_label"] == "API key · Hermes agent" and e["outcome"] == "denied" for e in log
    )
    assert any(
        e["actor_label"] == "API key · Reader" and e["action"].startswith("GET ") for e in log
    )

    key_id = next(k["id"] for k in listed if k["name"] == "Reader")
    assert client.delete(f"{w}/api-keys/{key_id}", headers=owner).status_code == 204
    assert client.get(f"{w}/content", headers=reader).status_code == 401


def test_webhooks_signed_filtered_and_retried(received: list[httpx.Request]) -> None:
    owner, w = _login("demo.creator1@creatoros.dev")
    made = client.post(
        f"{w}/webhooks",
        headers=owner,
        json={"url": "https://hooks.example/ok", "events": ["content.stage_changed"]},
    ).json()
    secret = made["secret"]
    client.post(
        f"{w}/webhooks", headers=owner, json={"url": "https://hooks.example/fail", "events": []}
    )
    assert (
        client.post(
            f"{w}/webhooks", headers=owner, json={"url": "http://hooks.example/x"}
        ).status_code
        == 422
    )

    item = client.post(
        f"{w}/content", headers=owner, json={"title": "Hooked", "pillar": "p", "hook": "h"}
    ).json()
    client.patch(f"{w}/content/{item['id']}", headers=owner, json={"stage": "scripted"})
    client.patch(
        f"{w}/content/{item['id']}", headers=owner, json={"title": "Renamed"}
    )  # no stage change → no event

    ok = [r for r in received if r.url.path == "/ok"]
    assert len(ok) == 1 and ok[0].headers["X-CreatorOS-Event"] == "content.stage_changed"
    body = ok[0].content
    expected = hmac.new(
        secret.encode(),
        f"{ok[0].headers['X-CreatorOS-Timestamp']}.".encode() + body,
        hashlib.sha256,
    ).hexdigest()
    assert ok[0].headers["X-CreatorOS-Signature"] == f"sha256={expected}"
    assert json.loads(body)["data"] == {
        "content_item_id": item["id"],
        "title": "Hooked",
        "from": "idea",
        "to": "scripted",
    }

    endpoints = {e["url"]: e["id"] for e in client.get(f"{w}/webhooks", headers=owner).json()}
    failing = client.get(
        f"{w}/webhooks/{endpoints['https://hooks.example/fail']}/deliveries", headers=owner
    ).json()
    assert (
        failing[0]["status"] == "pending"
        and failing[0]["attempts"] == 1
        and failing[0]["last_status_code"] == 500
    )
    test = client.post(
        f"{w}/webhooks/{endpoints['https://hooks.example/ok']}/test", headers=owner
    ).json()
    assert test["status"] == "delivered"
    assert (
        client.delete(
            f"{w}/webhooks/{endpoints['https://hooks.example/fail']}", headers=owner
        ).status_code
        == 204
    )
