"""Cross-tenant access control, end to end on the demo dataset: a brand must not read or change
another brand's records, and nobody may reach a deal-scoped record they are not on."""

import pytest
from fastapi.testclient import TestClient

import features.demo_mode.mode as demo_mode_switch
from features.demo_mode import DEMO_PASSWORD
from main import app
from shared.config import settings

client = TestClient(app)


@pytest.fixture
def demo(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(demo_mode_switch, "_supabase_available", False)
    monkeypatch.setattr(settings, "ENVIRONMENT", "development")


def _login(role: str, email: str) -> dict[str, str]:
    r = client.post(f"/auth/{role}/login", json={"email": email, "password": DEMO_PASSWORD})
    assert r.status_code == 200
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


def test_brand_cannot_reach_another_brands_records(demo: None) -> None:
    owner = _login("brand", "demo.brand1@creatoros.dev")
    other = _login("brand", "demo.brand2@creatoros.dev")
    contract = client.get("/contracts", headers=owner).json()[0]
    deliverable = client.get("/deliverables", headers=owner).json()[0]
    payment = client.get("/payments", headers=owner).json()[0]
    session = client.get("/negotiation/sessions", headers=owner).json()[0]

    # the owner can
    assert client.get(f"/contracts/{contract['id']}", headers=owner).status_code == 200
    assert client.get(f"/contracts/{contract['id']}/clauses", headers=owner).status_code == 200

    # another brand cannot
    forbidden = [
        client.get(f"/contracts/{contract['id']}", headers=other),
        client.get(f"/contracts/{contract['id']}/clauses", headers=other),
        client.patch(f"/contracts/{contract['id']}/status", headers=other, json={"status": "void"}),
        client.patch(
            f"/deliverables/{deliverable['id']}/status",
            headers=other,
            params={"deal_id": deliverable["deal_id"]},
            json={"status": "approved"},
        ),
        client.patch(
            f"/payments/{payment['contract_id']}/status",
            headers=other,
            params={"payment_id": payment["id"], "deal_id": deliverable["deal_id"]},
            json={"status": "paid"},
        ),
        client.get(f"/negotiation/sessions/{session['id']}/offers", headers=other),
        client.patch(f"/negotiation/sessions/{session['id']}/checklist", headers=other, json={}),
        client.post(
            f"/deals/{deliverable['deal_id']}/deliverables",
            headers=other,
            json={"deal_id": deliverable["deal_id"], "title": "x", "description": "x"},
        ),
    ]
    assert [r.status_code for r in forbidden] == [403] * len(forbidden)


def test_brand_cannot_view_a_creator_outside_its_roster(demo: None) -> None:
    owner = _login("brand", "demo.brand1@creatoros.dev")
    other = _login("brand", "demo.brand2@creatoros.dev")
    creator_id = client.get("/creators", headers=owner).json()[0]["id"]
    assert client.get(f"/creators/{creator_id}", headers=owner).status_code == 200
    assert client.get(f"/creators/{creator_id}", headers=other).status_code == 403
