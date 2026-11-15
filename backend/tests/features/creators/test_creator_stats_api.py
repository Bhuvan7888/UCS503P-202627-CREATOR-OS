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


def test_creator_updates_their_profile(request: pytest.FixtureRequest) -> None:
    h = _headers("creator", "demo.creator5@creatoros.dev")
    before = client.get("/creators/me", headers=h).json()
    # the demo store is shared by the whole test run (the demo-mode snapshot reads it): restore it
    original = next(c for c in store.creator_repo.data.values() if str(c.id) == before["id"])
    request.addfinalizer(lambda: store.creator_repo.data.__setitem__(original.id, original))

    r = client.patch(
        "/creators/me", headers=h, json={"instagram_handle": "@ishita.new", "niche": "  tech  "}
    )
    assert r.status_code == 200
    saved = r.json()
    assert saved["instagram_handle"] == "ishita.new" and saved["niche"] == "tech"
    # numbers are not edited here (they come from platform analytics)
    assert saved["followers_count"] == before["followers_count"]
    assert saved["stats_updated_at"] == before["stats_updated_at"]


def test_profile_validation_and_who_may_edit() -> None:
    h = _headers("creator", "demo.creator5@creatoros.dev")
    assert (
        client.patch(
            "/creators/me", headers=h, json={"instagram_handle": "", "niche": "x"}
        ).status_code
        == 422
    )
    brand = _headers("brand", "demo.brand2@creatoros.dev")
    ok = {"instagram_handle": "x", "niche": "tech"}
    assert client.patch("/creators/me", headers=brand, json=ok).status_code == 403
