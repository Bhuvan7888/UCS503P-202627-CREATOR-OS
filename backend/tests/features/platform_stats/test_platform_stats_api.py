from datetime import date, timedelta
from uuid import UUID

import pytest
from fastapi.testclient import TestClient

import features.demo_mode.mode as demo_mode_switch
from features.demo_mode import DEMO_PASSWORD
from features.demo_mode.demo_store import store
from main import app
from shared.config import settings

client = TestClient(app)


@pytest.fixture(autouse=True)
def demo(monkeypatch: pytest.MonkeyPatch, request: pytest.FixtureRequest):
    monkeypatch.setattr(demo_mode_switch, "_supabase_available", False)
    monkeypatch.setattr(settings, "ENVIRONMENT", "development")
    store.seed_if_needed()
    # the demo store is shared by the whole test run (the demo-mode snapshot reads it): put it back afterwards
    creators = dict(store.creator_repo.data)
    snapshots = dict(store.platform_snapshot_repo.data)

    def restore() -> None:
        store.creator_repo.data.clear()
        store.creator_repo.data.update(creators)
        store.platform_snapshot_repo.data.clear()
        store.platform_snapshot_repo.data.update(snapshots)

    request.addfinalizer(restore)


def _headers(role: str, email: str) -> dict[str, str]:
    r = client.post(f"/auth/{role}/login", json={"email": email, "password": DEMO_PASSWORD})
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


TODAY = [
    {
        "platform": "instagram",
        "followers_count": 70_000,
        "engagement_rate": 5.0,
        "avg_views": 20_000,
    },
    {"platform": "youtube", "followers_count": 30_000, "engagement_rate": 3.0, "avg_views": 8_000},
]


def test_creator_updates_today_and_the_totals_follow() -> None:
    h = _headers("creator", "demo.creator4@creatoros.dev")  # Kabir (boAt)
    assert client.get("/platform-stats/me", headers=h).json()["platforms"] == []

    r = client.put("/platform-stats/me", headers=h, json={"entries": TODAY})
    assert r.status_code == 200
    audience = r.json()
    assert audience["total_followers"] == 100_000 and audience["as_of"]
    assert [p["platform"] for p in audience["platforms"]] == ["youtube", "instagram"]

    me = client.get("/creators/me", headers=h).json()
    assert me["followers_count"] == 100_000 and me["follower_tier"] == "mid"
    assert me["engagement_rate"] == 4.4 and me["avg_views_per_week"] == 28_000
    assert me["stats_updated_at"]

    # saving again the same day replaces that day's numbers (no duplicate history)
    again = client.put(
        "/platform-stats/me",
        headers=h,
        json={"entries": [{"platform": "instagram", "followers_count": 71_000}]},
    ).json()
    insta = next(p for p in again["platforms"] if p["platform"] == "instagram")
    assert insta["followers_count"] == 71_000 and insta["change"] is None


def test_change_since_previous_update() -> None:
    h = _headers("creator", "demo.creator4@creatoros.dev")
    client.put("/platform-stats/me", headers=h, json={"entries": TODAY})
    me = UUID(client.get("/creators/me", headers=h).json()["id"])
    # move today's instagram row a week back, then update again today
    old = next(k for k in store.platform_snapshot_repo.data if k[0] == me and k[1] == "instagram")
    snap = store.platform_snapshot_repo.data.pop(old)
    week_ago = snap.recorded_at - timedelta(days=7)
    store.platform_snapshot_repo.data[(me, "instagram", week_ago)] = snap.model_copy(
        update={"recorded_at": week_ago}
    )
    r = client.put(
        "/platform-stats/me",
        headers=h,
        json={"entries": [{"platform": "instagram", "followers_count": 72_000}]},
    ).json()
    insta = next(p for p in r["platforms"] if p["platform"] == "instagram")
    assert insta["change"] == 2_000 and insta["previous_recorded_at"] == str(week_ago)
    assert date.fromisoformat(insta["recorded_at"]) > week_ago


def test_validation_and_who_can_see_what() -> None:
    h = _headers("creator", "demo.creator4@creatoros.dev")
    dup = {"entries": [TODAY[0], TODAY[0]]}
    assert client.put("/platform-stats/me", headers=h, json=dup).status_code == 422
    bad = {"entries": [{"platform": "tiktok", "followers_count": 1}]}
    assert client.put("/platform-stats/me", headers=h, json=bad).status_code == 422
    assert client.put("/platform-stats/me", headers=h, json={"entries": []}).status_code == 422

    client.put("/platform-stats/me", headers=h, json={"entries": TODAY})
    kabir = client.get("/creators/me", headers=h).json()["id"]
    boat = _headers("brand", "demo.brand2@creatoros.dev")
    seen = client.get(f"/platform-stats/creators/{kabir}", headers=boat)
    assert seen.status_code == 200 and seen.json()["total_followers"] == 100_000
    other = _headers("brand", "demo.brand1@creatoros.dev")
    assert client.get(f"/platform-stats/creators/{kabir}", headers=other).status_code == 403
    assert (
        client.put("/platform-stats/me", headers=boat, json={"entries": TODAY}).status_code == 403
    )
