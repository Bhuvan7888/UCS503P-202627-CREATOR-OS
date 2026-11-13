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


def _login(email: str) -> tuple[dict[str, str], str]:
    r = client.post("/auth/creator/login", json={"email": email, "password": DEMO_PASSWORD})
    h = {"Authorization": f"Bearer {r.json()['access_token']}"}
    return h, "/workspaces/" + client.get("/workspaces", headers=h).json()[0]["slug"]


def test_crm_deal_lifecycle_and_content_link(demo: None) -> None:
    me, w = _login("demo.creator1@creatoros.dev")
    other, ow = _login("demo.creator2@creatoros.dev")
    r = client.post(
        f"{w}/crm/deals",
        headers=me,
        json={
            "company_name": "Nykaa",
            "contact_name": "Priya",
            "deal_size": 40000,
            "tags": [" reel ", "reel", ""],
        },
    )
    assert r.status_code == 201
    deal = r.json()
    assert (deal["status"], deal["priority"], deal["currency"], deal["tags"]) == (
        "prospect",
        "medium",
        "INR",
        ["reel"],
    )
    assert client.post(f"{w}/crm/deals", headers=me, json={"company_name": ""}).status_code == 422

    moved = client.patch(f"{w}/crm/deals/{deal['id']}", headers=me, json={"status": "paid"}).json()
    assert moved["status"] == "paid"
    assert (
        client.patch(
            f"{w}/crm/deals/{deal['id']}", headers=me, json={"company_name": None}
        ).status_code
        == 400
    )
    stats = client.get(f"{w}/crm/stats", headers=me).json()
    assert stats["closed"] >= 1 and stats["value_by_currency"]["INR"] >= 40000

    # content links to a deal of the same workspace only
    item = client.post(
        f"{w}/content",
        headers=me,
        json={"title": "t", "pillar": "p", "hook": "h", "crm_deal_id": deal["id"]},
    )
    assert item.status_code == 201 and item.json()["crm_deal_id"] == deal["id"]
    stolen = client.post(
        f"{ow}/content",
        headers=other,
        json={"title": "t", "pillar": "p", "hook": "h", "crm_deal_id": deal["id"]},
    )
    assert stolen.status_code == 400

    # other workspaces can't see or change it
    assert client.get(f"{w}/crm/deals", headers=other).status_code == 403
    assert (
        client.patch(
            f"{ow}/crm/deals/{deal['id']}", headers=other, json={"status": "lost"}
        ).status_code
        == 422
    )
    assert (
        client.patch(
            f"{ow}/crm/deals/{deal['id']}", headers=other, json={"status": "active"}
        ).status_code
        == 404
    )
    assert client.delete(f"{ow}/crm/deals/{deal['id']}", headers=other).status_code == 404
    assert client.delete(f"{w}/crm/deals/{deal['id']}", headers=me).status_code == 204
    assert all(d["id"] != deal["id"] for d in client.get(f"{w}/crm/deals", headers=me).json())


def test_brand_deals_made_on_creator_os_show_read_only(demo: None) -> None:
    me, w = _login(
        "demo.creator1@creatoros.dev"
    )  # Ananya works with Mamaearth and Nykaa in the demo data
    deals = client.get(f"{w}/crm/platform-deals", headers=me).json()
    assert deals and {"Mamaearth", "Nykaa"} & {d["brand_name"] for d in deals}
