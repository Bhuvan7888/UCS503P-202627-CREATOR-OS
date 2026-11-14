"""Refactor safety net: locks the public HTTP contract of the API.

1. The exact set of (method, path) pairs exposed by the app must not change.
2. Every route that requires a session must reject an anonymous request with
   401 — before touching Supabase, so this runs fully offline.

Routes marked "public" are NOT requested here (they would hit the real
database). They are listed so that any change to the public surface shows up
as a diff in this file. Only sign-up/login and the static sample contract PDF
are public.
"""

import re

import pytest
from fastapi.testclient import TestClient

from main import app

# (method, path, auth) — auth is "brand" | "actor" (brand or creator) | "user" (any signed-in user) | "public"
API_CONTRACT: list[tuple[str, str, str]] = [
    ("POST", "/auth/brand/signup", "public"),
    ("POST", "/auth/brand/login", "public"),
    ("POST", "/auth/creator/signup", "public"),
    ("POST", "/auth/creator/login", "public"),
    ("POST", "/auth/creator/oauth", "user"),
    ("POST", "/creators", "brand"),
    ("GET", "/creators", "brand"),
    ("GET", "/creators/me/brands", "actor"),
    ("POST", "/creators/me/link-brand", "actor"),
    ("GET", "/creators/{id}", "actor"),
    ("POST", "/deals", "actor"),
    ("GET", "/deals", "actor"),
    ("POST", "/deals/{id}/view", "actor"),
    ("PATCH", "/deals/{id}/status", "actor"),
    ("GET", "/contracts/sample-contract-pdf", "public"),
    ("POST", "/deals/{deal_id}/contracts", "brand"),
    ("GET", "/contracts/{id}", "actor"),
    ("GET", "/contracts", "actor"),
    ("PATCH", "/contracts/{id}/status", "brand"),
    ("GET", "/deliverables", "actor"),
    ("POST", "/deals/{deal_id}/deliverables", "brand"),
    ("PATCH", "/deliverables/{id}/status", "actor"),
    ("GET", "/activity-log", "actor"),
    ("POST", "/activity-log", "actor"),
    ("POST", "/payments", "brand"),
    ("GET", "/payments", "actor"),
    ("PATCH", "/payments/{contract_id}/mark-paid", "brand"),
    ("PATCH", "/payments/{contract_id}/status", "brand"),
    ("GET", "/contracts/{contract_id}/clauses", "actor"),
    ("POST", "/contracts/{contract_id}/scan", "actor"),
    ("POST", "/contracts/{contract_id}/escalate", "actor"),
    ("POST", "/escalations/{escalation_id}/resolve", "brand"),
    ("GET", "/analytics/brand", "brand"),
    ("GET", "/messages/unread", "actor"),
    ("POST", "/messages/read", "actor"),
    ("GET", "/messages", "actor"),
    ("POST", "/messages", "actor"),
    ("GET", "/workspaces", "user"),
    ("POST", "/workspaces", "user"),
    ("GET", "/workspaces/{workspace}", "user"),
    ("GET", "/workspaces/{workspace}/members", "user"),
    ("PATCH", "/workspaces/{workspace}", "user"),
    ("PATCH", "/workspaces/{workspace}/members/{user_id}", "user"),
    ("DELETE", "/workspaces/{workspace}/members/{user_id}", "user"),
    ("GET", "/workspaces/{workspace}/invites", "user"),
    ("POST", "/workspaces/{workspace}/invites", "user"),
    ("DELETE", "/workspaces/{workspace}/invites/{invite_id}", "user"),
    ("GET", "/workspaces/{workspace}/roles", "user"),
    ("PUT", "/workspaces/{workspace}/roles/{role}", "user"),
    ("GET", "/workspaces/{workspace}/audit-log", "user"),
    ("GET", "/workspaces/{workspace}/api-keys", "user"),
    ("POST", "/workspaces/{workspace}/api-keys", "user"),
    ("DELETE", "/workspaces/{workspace}/api-keys/{key_id}", "user"),
    ("GET", "/workspaces/{workspace}/webhooks", "user"),
    ("POST", "/workspaces/{workspace}/webhooks", "user"),
    ("DELETE", "/workspaces/{workspace}/webhooks/{endpoint_id}", "user"),
    ("GET", "/workspaces/{workspace}/webhooks/{endpoint_id}/deliveries", "user"),
    ("POST", "/workspaces/{workspace}/webhooks/{endpoint_id}/test", "user"),
    ("GET", "/workspaces/{workspace}/notifications", "user"),
    ("GET", "/workspaces/{workspace}/notifications/unread-count", "user"),
    ("POST", "/workspaces/{workspace}/notifications/read", "user"),
    ("POST", "/workspaces/{workspace}/notifications/{notification_id}/archive", "user"),
    ("GET", "/workspaces/{workspace}/support/tickets", "user"),
    ("POST", "/workspaces/{workspace}/support/tickets", "user"),
    ("POST", "/workspaces/{workspace}/support/tickets/{ticket_id}/close", "user"),
    ("GET", "/me/profile", "user"),
    ("PUT", "/me/profile", "user"),
    ("GET", "/me/notification-preferences", "user"),
    ("PUT", "/me/notification-preferences", "user"),
    ("GET", "/invites/{token}", "user"),
    ("POST", "/invites/{token}/accept", "user"),
    ("GET", "/workspaces/{workspace}/content", "user"),
    ("POST", "/workspaces/{workspace}/content", "user"),
    ("GET", "/workspaces/{workspace}/content/stats", "user"),
    ("PATCH", "/workspaces/{workspace}/content/{item_id}", "user"),
    ("GET", "/workspaces/{workspace}/content/{item_id}/script", "user"),
    ("PUT", "/workspaces/{workspace}/content/{item_id}/script", "user"),
    ("GET", "/workspaces/{workspace}/ai-knowledge", "user"),
    ("PUT", "/workspaces/{workspace}/ai-knowledge", "user"),
    ("POST", "/workspaces/{workspace}/ai/generate", "user"),
    ("GET", "/workspaces/{workspace}/ai/suggestions", "user"),
    ("POST", "/workspaces/{workspace}/ai/suggestions/refresh", "user"),
    ("POST", "/workspaces/{workspace}/ai/suggestions/{suggestion_id}/dismiss", "user"),
    ("GET", "/workspaces/{workspace}/approvals", "user"),
    ("POST", "/workspaces/{workspace}/approvals", "user"),
    ("POST", "/workspaces/{workspace}/approvals/{request_id}/approve", "user"),
    ("POST", "/workspaces/{workspace}/approvals/{request_id}/reject", "user"),
    ("GET", "/workspaces/{workspace}/crm/deals", "user"),
    ("POST", "/workspaces/{workspace}/crm/deals", "user"),
    ("PATCH", "/workspaces/{workspace}/crm/deals/{deal_id}", "user"),
    ("DELETE", "/workspaces/{workspace}/crm/deals/{deal_id}", "user"),
    ("GET", "/workspaces/{workspace}/crm/stats", "user"),
    ("GET", "/workspaces/{workspace}/crm/platform-deals", "user"),
]

_PLACEHOLDER_ID = "00000000-0000-0000-0000-000000000001"
client = TestClient(app)


def test_route_table_is_unchanged():
    schema = app.openapi()
    actual = {(m.upper(), p) for p, ops in schema["paths"].items() for m in ops}
    expected = {(m, p) for m, p, _ in API_CONTRACT}
    assert actual == expected


@pytest.mark.parametrize(
    ("method", "path"),
    [(m, p) for m, p, auth in API_CONTRACT if auth != "public"],
)
def test_protected_route_rejects_anonymous_request(method: str, path: str):
    url = re.sub(r"\{[^}]+\}", _PLACEHOLDER_ID, path)
    body: dict[str, object] | None = {} if method in ("POST", "PATCH", "PUT") else None
    response = client.request(method, url, json=body)
    assert response.status_code == 401
