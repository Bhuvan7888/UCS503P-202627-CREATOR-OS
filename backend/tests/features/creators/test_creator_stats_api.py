import pytest
from fastapi.testclient import TestClient

import features.demo_mode.mode as demo_mode_switch
from features.demo_mode import DEMO_PASSWORD
from features.demo_mode.demo_store import store
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


def test_creator_updates_their_stats_and_brands_see_when(request: pytest.FixtureRequest) -> None:
    h = _headers("creator", "demo.creator5@creatoros.dev")
    before = client.get("/creators/me", headers=h).json()
    # the demo store is shared by the whole test run (the demo-mode snapshot reads it): restore it
    original = store.creator_repo.data[
        next(k for k in store.creator_repo.data if str(k) == before["id"])
    ]
    request.addfinalizer(lambda: store.creator_repo.data.__setitem__(original.id, original))

    body = {
        "instagram_handle": "@ishita.new",
        "niche": "  tech  ",
        "follower_tier": "mid",
        "followers_count": 120000,
        "engagement_rate": 4.4,
        "avg_views_per_week": 30000,
    }
    r = client.patch("/creators/me", headers=h, json=body)
    assert r.status_code == 200
    saved = r.json()
    assert saved["instagram_handle"] == "ishita.new" and saved["niche"] == "tech"
    assert saved["followers_count"] == 120000 and saved["stats_updated_at"]

    brand = _headers("brand", "demo.brand2@creatoros.dev")  # boAt works with Ishita
    seen = client.get(f"/creators/{before['id']}", headers=brand).json()
    assert seen["stats_updated_at"] == saved["stats_updated_at"]


def test_stats_validation_and_who_may_edit() -> None:
    h = _headers("creator", "demo.creator5@creatoros.dev")
    ok = {"instagram_handle": "x", "niche": "tech", "follower_tier": "mid", "followers_count": 1}
    assert (
        client.patch("/creators/me", headers=h, json={**ok, "follower_tier": "huge"}).status_code
        == 422
    )
    assert (
        client.patch("/creators/me", headers=h, json={**ok, "followers_count": -1}).status_code
        == 422
    )
    assert (
        client.patch("/creators/me", headers=h, json={**ok, "engagement_rate": 150}).status_code
        == 422
    )
    brand = _headers("brand", "demo.brand2@creatoros.dev")
    assert client.patch("/creators/me", headers=brand, json=ok).status_code == 403
