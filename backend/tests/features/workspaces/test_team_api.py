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


def _login(email: str) -> dict[str, str]:
    r = client.post("/auth/creator/login", json={"email": email, "password": DEMO_PASSWORD})
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


OWNER, WRITER, OTHER = (
    "demo.creator2@creatoros.dev",
    "demo.creator5@creatoros.dev",
    "demo.creator4@creatoros.dev",
)


def test_invite_accept_and_permissions(demo: None) -> None:
    owner, writer, other = _login(OWNER), _login(WRITER), _login(OTHER)
    ws = client.get("/workspaces", headers=owner).json()[0]
    w = f"/workspaces/{ws['slug']}"
    assert ws["role"] == "owner" and len(ws["permissions"]) == 11

    made = client.post(
        f"{w}/invites", headers=owner, json={"email": WRITER.upper(), "role": "script_writer"}
    )
    assert made.status_code == 201
    token = made.json()["accept_path"].rsplit("/", 1)[1]
    assert (
        client.post(
            f"{w}/invites", headers=owner, json={"email": WRITER, "role": "script_writer"}
        ).status_code
        == 409
    )
    assert (
        client.post(
            f"{w}/invites", headers=owner, json={"email": "not-an-email", "role": "script_writer"}
        ).status_code
        == 422
    )

    preview = client.get(f"/invites/{token}", headers=writer).json()
    assert (preview["role"], preview["expired"], preview["accepted"]) == (
        "script_writer",
        False,
        False,
    )
    assert client.post(f"/invites/{token}/accept", headers=other).status_code == 403  # wrong email
    assert client.post(f"/invites/{token}/accept", headers=writer).status_code == 200
    assert client.post(f"/invites/{token}/accept", headers=writer).status_code == 409  # used

    mine = next(x for x in client.get("/workspaces", headers=writer).json() if x["id"] == ws["id"])
    assert mine["role"] == "script_writer" and "create_content" not in mine["permissions"]

    # the script writer can write scripts and move cards, not create content or open the CRM
    item = client.post(
        f"{w}/content", headers=owner, json={"title": "t", "pillar": "p", "hook": "h"}
    ).json()
    assert (
        client.post(
            f"{w}/content", headers=writer, json={"title": "t", "pillar": "p", "hook": "h"}
        ).status_code
        == 403
    )
    assert (
        client.put(
            f"{w}/content/{item['id']}/script", headers=writer, json={"body": "draft"}
        ).status_code
        == 200
    )
    assert (
        client.patch(
            f"{w}/content/{item['id']}", headers=writer, json={"stage": "in_production"}
        ).status_code
        == 200
    )
    assert client.get(f"{w}/crm/deals", headers=writer).status_code == 403
    assert client.get(f"{w}/audit-log", headers=writer).status_code == 403
    assert (
        client.put(
            f"{w}/roles/script_writer", headers=writer, json={"permissions": ["create_content"]}
        ).status_code
        == 403
    )

    # owner: role change opens the CRM; editing the role's permissions closes it again
    members = client.get(f"{w}/members", headers=owner).json()
    writer_id = next(m["user_id"] for m in members if m["role"] == "script_writer")
    assert (
        client.patch(
            f"{w}/members/{writer_id}", headers=owner, json={"role": "brand_manager"}
        ).status_code
        == 204
    )
    assert client.get(f"{w}/crm/deals", headers=writer).status_code == 200
    roles = client.put(
        f"{w}/roles/brand_manager", headers=owner, json={"permissions": ["view_dashboard"]}
    ).json()
    assert next(r for r in roles if r["role"] == "brand_manager")["permissions"] == [
        "view_dashboard"
    ]
    assert client.get(f"{w}/crm/deals", headers=writer).status_code == 403
    assert (
        client.put(
            f"{w}/roles/brand_manager", headers=owner, json={"permissions": ["fly"]}
        ).status_code
        == 400
    )

    owner_id = next(m["user_id"] for m in members if m["role"] == "owner")
    assert client.delete(f"{w}/members/{owner_id}", headers=owner).status_code == 409
    assert client.delete(f"{w}/members/{writer_id}", headers=owner).status_code == 204
    assert client.get(f"{w}/content", headers=writer).status_code == 403

    log = client.get(f"{w}/audit-log", headers=owner).json()
    actions = {(e["action"], e["outcome"]) for e in log}
    assert {
        ("Invited a member", "allowed"),
        ("Joined the workspace", "allowed"),
        ("Was refused", "denied"),
        ("Removed a member", "allowed"),
    } <= actions


def test_seats_rename_and_revoke(demo: None) -> None:
    owner = _login("demo.creator3@creatoros.dev")
    w = "/workspaces/" + client.get("/workspaces", headers=owner).json()[0]["slug"]
    for n in range(2):
        assert (
            client.post(
                f"{w}/invites", headers=owner, json={"email": f"v{n}@x.dev", "role": "video_editor"}
            ).status_code
            == 201
        )
    full = client.post(
        f"{w}/invites", headers=owner, json={"email": "v9@x.dev", "role": "video_editor"}
    )
    assert full.status_code == 409 and "seats" in full.json()["detail"]
    roles = {r["role"]: r for r in client.get(f"{w}/roles", headers=owner).json()}
    assert roles["video_editor"]["seats_total"] == 2
    first = client.get(f"{w}/invites", headers=owner).json()[0]
    assert client.delete(f"{w}/invites/{first['id']}", headers=owner).status_code == 204
    assert (
        client.post(
            f"{w}/invites", headers=owner, json={"email": "v9@x.dev", "role": "video_editor"}
        ).status_code
        == 201
    )
    renamed = client.patch(w, headers=owner, json={"name": "Zara Studio"})
    assert renamed.status_code == 200 and renamed.json()["name"] == "Zara Studio"
    client.get(w, headers=owner)
    client.get(w, headers=owner)  # opening twice in a row is logged once
    opens = [
        e
        for e in client.get(f"{w}/audit-log", headers=owner).json()
        if e["action"] == "Opened the workspace"
    ]
    assert len(opens) == 1
