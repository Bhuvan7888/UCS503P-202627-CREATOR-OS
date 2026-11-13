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
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


def test_creator_gets_a_primary_workspace_and_can_open_it_by_slug_or_id(demo: None) -> None:
    me = _login("creator", "demo.creator4@creatoros.dev")
    workspaces = client.get("/workspaces", headers=me).json()
    assert [(w["name"], w["role"], w["is_primary"]) for w in workspaces] == [
        ("My Workspace", "owner", True)
    ]
    ws = workspaces[0]
    assert client.get("/workspaces", headers=me).json()[0]["id"] == ws["id"]  # idempotent
    assert client.get(f"/workspaces/{ws['slug']}", headers=me).status_code == 200
    assert client.get(f"/workspaces/{ws['id']}", headers=me).json()["slug"] == ws["slug"]


def test_non_members_and_unknown_workspaces(demo: None) -> None:
    owner = _login("creator", "demo.creator4@creatoros.dev")
    other = _login("creator", "demo.creator5@creatoros.dev")
    ws = client.get("/workspaces", headers=owner).json()[0]
    assert client.get(f"/workspaces/{ws['slug']}", headers=other).status_code == 403
    assert client.get("/workspaces/ws-00000000", headers=owner).status_code == 404
    assert client.get(f"/workspaces/{ws['slug']}").status_code == 401


def test_brands_have_no_creator_workspaces(demo: None) -> None:
    assert (
        client.get("/workspaces", headers=_login("brand", "demo.brand3@creatoros.dev")).json() == []
    )
