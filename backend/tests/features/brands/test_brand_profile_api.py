import pytest
from fastapi.testclient import TestClient

import features.demo_mode.mode as demo_mode_switch
from features.demo_mode import DEMO_PASSWORD
from main import app
from shared.config import settings

client = TestClient(app)


@pytest.fixture(autouse=True)
def demo(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setattr(demo_mode_switch, "_supabase_available", False)
    monkeypatch.setattr(settings, "ENVIRONMENT", "development")


def _headers(role: str, email: str) -> dict[str, str]:
    r = client.post(f"/auth/{role}/login", json={"email": email, "password": DEMO_PASSWORD})
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


def test_brand_reads_and_updates_its_profile() -> None:
    h = _headers("brand", "demo.brand3@creatoros.dev")
    assert client.get("/brands/me", headers=h).json()["name"] == "Nykaa"
    r = client.patch(
        "/brands/me",
        headers=h,
        json={
            "name": "Nykaa",
            "description": "  Beauty marketplace  ",
            "industry": "Beauty",
            "website": "",
            "gst_number": "27ABCDE1234F1Z5",
            "pan_number": "ABCDE1234F",
        },
    )
    assert r.status_code == 200
    body = r.json()
    assert body["description"] == "Beauty marketplace" and body["website"] is None
    assert client.get("/brands/me", headers=h).json()["industry"] == "Beauty"


def test_profile_validation_and_access() -> None:
    h = _headers("brand", "demo.brand3@creatoros.dev")
    assert client.patch("/brands/me", headers=h, json={"name": ""}).status_code == 422
    bad_pan = client.patch("/brands/me", headers=h, json={"name": "Nykaa", "pan_number": "123"})
    assert bad_pan.status_code == 422
    creator = _headers("creator", "demo.creator1@creatoros.dev")
    assert client.get("/brands/me", headers=creator).status_code == 403
