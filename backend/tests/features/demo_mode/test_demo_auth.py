import pytest

import features.demo_mode.mode as mode
from features.demo_mode import (
    DEMO_CREATORS,
    DEMO_PASSWORD,
    authenticate_demo_brand,
    authenticate_demo_creator,
    resolve_demo_actor,
)
from shared.config import settings

BRAND = "demo.brand1@creatoros.dev"
CREATOR = "demo.creator1@creatoros.dev"


@pytest.fixture
def demo_mode(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(mode, "_supabase_available", False)
    monkeypatch.setattr(settings, "ENVIRONMENT", "development")


def test_demo_login_works_with_the_demo_password_in_demo_mode(demo_mode: None) -> None:
    session = authenticate_demo_creator(CREATOR, DEMO_PASSWORD)
    assert session is not None
    assert resolve_demo_actor(session.access_token) is not None


def test_demo_login_rejects_a_wrong_password(demo_mode: None) -> None:
    assert authenticate_demo_brand(BRAND, "anything") is None


def test_demo_accounts_are_disabled_when_supabase_is_live(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(mode, "_supabase_available", True)
    assert authenticate_demo_brand(BRAND, DEMO_PASSWORD) is None
    creator = DEMO_CREATORS[CREATOR]
    assert resolve_demo_actor(f"demo-token-creator-{creator['creator_id']}") is None


def test_demo_accounts_are_disabled_in_production(
    demo_mode: None, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, "ENVIRONMENT", "production")
    assert authenticate_demo_brand(BRAND, DEMO_PASSWORD) is None


def test_raw_user_id_is_not_accepted_as_a_token(demo_mode: None) -> None:
    assert resolve_demo_actor(str(DEMO_CREATORS[CREATOR]["user_id"])) is None
