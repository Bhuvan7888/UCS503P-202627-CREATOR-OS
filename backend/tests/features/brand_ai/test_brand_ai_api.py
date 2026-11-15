from uuid import UUID

import pytest
from fastapi.testclient import TestClient

import features.demo_mode.mode as demo_mode_switch
from features.brand_ai.models import CreatorMatchDraft
from features.brand_ai.router import get_brand_llm
from features.demo_mode import DEMO_PASSWORD
from features.demo_mode.demo_store import store
from main import app
from shared.config import settings
from shared.llm.llm_port import LLMRateLimitError
from tests.fakes.fake_repos import FakeLLMPort

client = TestClient(app)


@pytest.fixture
def llm(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setattr(demo_mode_switch, "_supabase_available", False)
    monkeypatch.setattr(settings, "ENVIRONMENT", "development")
    fake = FakeLLMPort(explanation="Brief text")
    app.dependency_overrides[get_brand_llm] = lambda: fake
    yield fake
    app.dependency_overrides.pop(get_brand_llm, None)


def _headers(role: str, email: str) -> dict[str, str]:
    r = client.post(f"/auth/{role}/login", json={"email": email, "password": DEMO_PASSWORD})
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


def test_ai_knowledge_feeds_the_brief_and_the_brief_saves(llm: FakeLLMPort) -> None:
    h = _headers("brand", "demo.brand1@creatoros.dev")
    assert client.get("/brand-ai/profile", headers=h).json()["voice"] == ""
    saved = client.put("/brand-ai/profile", headers=h, json={"voice": "Warm and natural"})
    assert saved.status_code == 200 and saved.json()["voice"] == "Warm and natural"

    deal = client.get("/deals", headers=h).json()[0]
    base = f"/brand-ai/deals/{deal['id']}/brief"
    assert client.get(base, headers=h).json() is None
    generated = client.post(f"{base}/generate", headers=h)
    assert generated.status_code == 200 and generated.json() == {"text": "Brief text"}
    assert "Warm and natural" in llm.last_prompt and deal["campaign_name"] in llm.last_prompt

    put = client.put(base, headers=h, json={"content": "  Final brief  "})
    assert put.status_code == 200 and put.json()["content"] == "Final brief"
    assert client.get(base, headers=h).json()["content"] == "Final brief"


def test_matching_ranks_only_roster_creators(llm: FakeLLMPort) -> None:
    h = _headers("brand", "demo.brand1@creatoros.dev")
    roster = client.get("/creators", headers=h).json()
    llm.structured = [
        CreatorMatchDraft(creator_id=roster[0]["id"], score=72, reason="Good fit"),
        CreatorMatchDraft(creator_id="not-on-roster", score=99, reason="Invented"),
        CreatorMatchDraft(creator_id=roster[-1]["id"], score=140, reason="Great fit"),
    ]
    r = client.post("/brand-ai/match", headers=h, json={"campaign": "Winter skincare launch reels"})
    assert r.status_code == 200
    matches = r.json()["matches"]
    assert [m["score"] for m in matches] == [100, 72]  # clamped, sorted, invented id dropped
    assert "Winter skincare" in llm.last_prompt
    short = client.post("/brand-ai/match", headers=h, json={"campaign": "short"})
    assert short.status_code == 422


def test_reply_draft_uses_the_thread_and_needs_a_relationship(
    llm: FakeLLMPort, request: pytest.FixtureRequest
) -> None:
    h = _headers("brand", "demo.brand1@creatoros.dev")
    creator = client.get("/creators", headers=h).json()[0]
    sent = client.post(
        "/messages", headers=h, params={"with_id": creator["id"]}, json={"body": "Hi there!"}
    ).json()
    # the demo store is shared by the whole test run (the demo-mode snapshot reads it): undo the message
    request.addfinalizer(lambda: store.message_repo.data.pop(UUID(sent["id"]), None))
    r = client.post(f"/brand-ai/chat/{creator['id']}/draft", headers=h)
    assert r.status_code == 200 and r.json()["text"] == "Brief text"
    assert "Hi there!" in llm.last_prompt
    other = _headers("brand", "demo.brand2@creatoros.dev")
    assert client.post(f"/brand-ai/chat/{creator['id']}/draft", headers=other).status_code == 404


def test_unavailable_ai_and_access_rules(llm: FakeLLMPort) -> None:
    h = _headers("brand", "demo.brand1@creatoros.dev")
    deal = client.get("/deals", headers=h).json()[0]
    llm.should_fail = True
    r = client.post(f"/brand-ai/deals/{deal['id']}/brief/generate", headers=h)
    assert r.status_code == 503 and "temporarily unavailable" in r.json()["detail"]
    other = _headers("brand", "demo.brand2@creatoros.dev")
    assert client.get(f"/brand-ai/deals/{deal['id']}/brief", headers=other).status_code == 403
    creator = _headers("creator", "demo.creator1@creatoros.dev")
    assert client.get("/brand-ai/profile", headers=creator).status_code == 403


def test_provider_rate_limit_says_when_to_retry(llm: FakeLLMPort) -> None:
    h = _headers("brand", "demo.brand1@creatoros.dev")
    deal = client.get("/deals", headers=h).json()[0]

    async def limited(prompt: str) -> str:
        raise LLMRateLimitError(42)

    llm.write = limited
    r = client.post(f"/brand-ai/deals/{deal['id']}/brief/generate", headers=h)
    assert r.status_code == 429 and "about 42 seconds" in r.json()["detail"]
