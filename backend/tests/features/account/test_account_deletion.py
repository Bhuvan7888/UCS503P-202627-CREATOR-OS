from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

import features.demo_mode.mode as demo_mode_switch
from features.account import AccountService
from features.auth import dependencies as auth_deps
from features.demo_mode import DEMO_PASSWORD
from features.demo_mode.in_memory_repositories import DemoAccountRepo, DemoUserDirectory
from main import app
from shared.config import settings


class RecordingEraser:
    def __init__(self):
        self.erased = []

    async def erase(self, user_id):
        self.erased.append(user_id)


@pytest.mark.asyncio
async def test_deleting_erases_exactly_that_person():
    eraser = RecordingEraser()
    user = uuid4()
    await AccountService(DemoAccountRepo(), DemoUserDirectory(), eraser).delete_account(user)
    assert eraser.erased == [user]


def test_confirmation_is_required_and_demo_accounts_are_protected(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setattr(demo_mode_switch, "_supabase_available", False)
    monkeypatch.setattr(settings, "ENVIRONMENT", "development")
    client = TestClient(app)
    token = client.post(
        "/auth/creator/login",
        json={"email": "demo.creator1@creatoros.dev", "password": DEMO_PASSWORD},
    ).json()["access_token"]
    h = {"Authorization": f"Bearer {token}"}
    assert client.request("DELETE", "/me", headers=h, json={"confirm": "yes"}).status_code == 422
    assert client.request("DELETE", "/me", headers=h, json={"confirm": "DELETE"}).status_code == 409


def test_forget_user_drops_cached_sessions():
    user, other = uuid4(), uuid4()
    auth_deps._user_cache.update({"t1": (user, 1e12), "t2": (other, 1e12)})
    auth_deps.forget_user(user)
    assert "t1" not in auth_deps._user_cache and "t2" in auth_deps._user_cache
    auth_deps._user_cache.pop("t2")
