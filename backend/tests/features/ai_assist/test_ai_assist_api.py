import pytest
from fastapi.testclient import TestClient

import features.demo_mode.mode as demo_mode_switch
from features.ai_assist.router import get_llm
from features.demo_mode import DEMO_PASSWORD
from main import app
from shared.config import settings
from tests.fakes.fake_repos import FakeLLMPort

client = TestClient(app)


@pytest.fixture
def demo(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setattr(demo_mode_switch, "_supabase_available", False)
    monkeypatch.setattr(settings, "ENVIRONMENT", "development")
    llm = FakeLLMPort(explanation="Wake up at 5")
    app.dependency_overrides[get_llm] = lambda: llm
    yield llm
    app.dependency_overrides.pop(get_llm, None)


def _login(email: str) -> tuple[dict[str, str], str]:
    r = client.post("/auth/creator/login", json={"email": email, "password": DEMO_PASSWORD})
    h = {"Authorization": f"Bearer {r.json()['access_token']}"}
    return h, client.get("/workspaces", headers=h).json()[0]["slug"]


def test_knowledge_feeds_generation(demo: FakeLLMPort) -> None:
    h, ws = _login("demo.creator3@creatoros.dev")
    assert client.get(f"/workspaces/{ws}/ai-knowledge", headers=h).json()["brand"] == ""
    saved = client.put(f"/workspaces/{ws}/ai-knowledge", headers=h, json={"brand": "Budget travel"})
    assert saved.status_code == 200 and saved.json()["brand"] == "Budget travel"
    r = client.post(
        f"/workspaces/{ws}/ai/generate",
        headers=h,
        json={"field": "title", "draft": {"pillar": "Travel"}},
    )
    assert r.status_code == 200 and r.json() == {"text": "Wake up at 5"}
    assert "Budget travel" in demo.last_prompt and "Travel" in demo.last_prompt
    outline = client.post(
        f"/workspaces/{ws}/ai/generate", headers=h, json={"field": "outline", "draft": {}}
    )
    assert outline.status_code == 400  # needs a title


def test_suggestions_generate_cache_and_dismiss(demo: FakeLLMPort) -> None:
    h, ws = _login("demo.creator3@creatoros.dev")
    base = f"/workspaces/{ws}/ai/suggestions"
    fresh = client.post(f"{base}/refresh", headers=h).json()
    assert len(fresh["suggestions"]) == 6 and fresh["generated_at"]
    assert client.get(base, headers=h).json() == fresh  # cached
    first = fresh["suggestions"][0]["id"]
    dismissed = client.post(f"{base}/{first}/dismiss", headers=h).json()
    assert dismissed["suggestions"][0]["dismissed"] is True
    assert client.post(f"{base}/nope/dismiss", headers=h).status_code == 404


def test_ai_unavailable_and_other_workspaces(demo: FakeLLMPort) -> None:
    h, ws = _login("demo.creator3@creatoros.dev")
    other, _ = _login("demo.creator5@creatoros.dev")
    assert client.get(f"/workspaces/{ws}/ai-knowledge", headers=other).status_code == 403
    assert client.post(f"/workspaces/{ws}/ai/suggestions/refresh", headers=other).status_code == 403
    demo.should_fail = True
    r = client.post(
        f"/workspaces/{ws}/ai/generate", headers=h, json={"field": "hook", "draft": {"title": "t"}}
    )
    assert r.status_code == 503 and "temporarily unavailable" in r.json()["detail"]
    app.dependency_overrides[get_llm] = lambda: None  # no Gemini key configured
    assert client.post(f"/workspaces/{ws}/ai/suggestions/refresh", headers=h).status_code == 503
