from datetime import UTC, datetime, timedelta
from uuid import uuid4

from features.ai_assist.models import AiKnowledgeSave, ContentDraft
from features.ai_assist.rules import RateLimiter, clean_generated, generate_prompt, is_fresh

NOW = datetime(2026, 11, 14, tzinfo=UTC)


def test_prompt_includes_only_filled_knowledge_and_draft_fields():
    k = AiKnowledgeSave(
        brand="Fitness for busy parents", audience="", custom_output_format="Bullets"
    )
    prompt = generate_prompt("hook", ContentDraft(title="5 min workouts", pillar="Fitness"), k)
    assert (
        "Brand: Fitness for busy parents" in prompt and "Required output format: Bullets" in prompt
    )
    assert (
        "Audience" not in prompt and "Title: 5 min workouts" in prompt and "opening line" in prompt
    )
    assert "About this creator" not in generate_prompt("title", ContentDraft(), None)


def test_clean_generated_strips_quotes_and_caps_length():
    assert clean_generated('  "Wake up at 5"  ', "title") == "Wake up at 5"
    assert len(clean_generated("x" * 900, "hook")) == 500
    assert clean_generated('"quoted outline"', "outline") == '"quoted outline"'


def test_suggestions_stay_fresh_for_24_hours():
    assert is_fresh(NOW - timedelta(hours=23), NOW)
    assert not is_fresh(NOW - timedelta(hours=24), NOW) and not is_fresh(None, NOW)


def test_rate_limiter_is_per_workspace_and_slides():
    limiter, ws, other = RateLimiter(limit=2, window=timedelta(minutes=10)), uuid4(), uuid4()
    assert limiter.allow(ws, NOW) and limiter.allow(ws, NOW)
    assert not limiter.allow(ws, NOW) and limiter.allow(other, NOW)
    assert limiter.allow(ws, NOW + timedelta(minutes=10))
