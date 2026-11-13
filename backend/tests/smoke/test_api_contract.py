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
    ("POST", "/creators", "brand"),
    ("GET", "/creators", "brand"),
    ("PATCH", "/creators/me", "actor"),
    ("GET", "/creators/me/brands", "actor"),
    ("POST", "/creators/me/link-brand", "actor"),
    ("POST", "/creators/me/growth-snapshots", "actor"),
    ("GET", "/creators/me/growth-snapshots", "actor"),
    ("GET", "/creators/{id}", "actor"),
    ("POST", "/deals", "actor"),
    ("GET", "/deals", "actor"),
    ("GET", "/deals/stats", "actor"),
    ("POST", "/deals/{id}/view", "actor"),
    ("GET", "/deals/weekly-value", "actor"),
    ("PATCH", "/deals/{id}/status", "actor"),
    ("GET", "/contracts/sample-contract-pdf", "public"),
    ("POST", "/contracts/upload-sample", "actor"),
    ("POST", "/deals/{deal_id}/contracts", "brand"),
    ("POST", "/creators/me/contracts", "actor"),
    ("GET", "/contracts/{id}", "actor"),
    ("GET", "/contracts", "actor"),
    ("PATCH", "/contracts/{id}/creator-status", "actor"),
    ("PATCH", "/contracts/{id}/status", "brand"),
    ("GET", "/deliverables", "actor"),
    ("POST", "/deals/{deal_id}/deliverables", "brand"),
    ("PATCH", "/deliverables/{id}/status", "actor"),
    ("GET", "/activity-log", "actor"),
    ("POST", "/activity-log", "actor"),
    ("POST", "/negotiation/sessions", "actor"),
    ("GET", "/negotiation/sessions", "actor"),
    ("GET", "/negotiation/sessions/{id}/rate-range", "actor"),
    ("GET", "/negotiation/sessions/{id}/forecast", "actor"),
    ("PATCH", "/negotiation/sessions/{id}/checklist", "actor"),
    ("POST", "/negotiation/sessions/{id}/counter-offer", "actor"),
    ("POST", "/negotiation/sessions/{id}/conversations", "actor"),
    ("GET", "/negotiation/sessions/{id}/conversations", "actor"),
    ("GET", "/negotiation/sessions/{id}/offers", "actor"),
    ("POST", "/negotiation/sessions/{id}/script", "actor"),
    ("POST", "/payments", "brand"),
    ("GET", "/payments", "actor"),
    ("PATCH", "/payments/{contract_id}/mark-paid", "brand"),
    ("PATCH", "/payments/{contract_id}/status", "brand"),
    ("GET", "/contracts/{contract_id}/clauses", "actor"),
    ("POST", "/contracts/{contract_id}/scan", "actor"),
    ("POST", "/contracts/{contract_id}/escalate", "actor"),
    ("POST", "/escalations/{escalation_id}/resolve", "brand"),
    ("GET", "/benchmarks", "actor"),
    ("GET", "/analytics/brand", "brand"),
    ("GET", "/messages/unread", "actor"),
    ("POST", "/messages/read", "actor"),
    ("GET", "/messages", "actor"),
    ("POST", "/messages", "actor"),
    ("GET", "/workspaces", "user"),
    ("POST", "/workspaces", "user"),
    ("GET", "/workspaces/{workspace}", "user"),
    ("GET", "/workspaces/{workspace}/members", "user"),
    ("GET", "/workspaces/{workspace}/content", "user"),
    ("POST", "/workspaces/{workspace}/content", "user"),
    ("GET", "/workspaces/{workspace}/content/stats", "user"),
    ("PATCH", "/workspaces/{workspace}/content/{item_id}", "user"),
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
    body: dict[str, object] | None = {} if method in ("POST", "PATCH") else None
    response = client.request(method, url, json=body)
    assert response.status_code == 401
