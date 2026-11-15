from datetime import UTC, datetime
from uuid import uuid4

from features.brand_ai.models import CreatorMatchDraft
from features.brand_ai.rules import MAX_MATCHES, clean_text, valid_matches
from features.creators import Creator


def _creator(name: str) -> Creator:
    return Creator(
        id=uuid4(),
        display_name=name,
        instagram_handle=name.lower(),
        niche="beauty",
        follower_tier="micro",
        created_at=datetime.now(UTC),
    )


def test_valid_matches_dedupes_clamps_sorts_and_caps() -> None:
    roster = [_creator(f"C{i}") for i in range(7)]
    drafts = [
        CreatorMatchDraft(creator_id=str(c.id), score=10 * i, reason=" r ")
        for i, c in enumerate(roster)
    ]
    drafts.append(CreatorMatchDraft(creator_id=str(roster[0].id), score=-5, reason="dup"))
    out = valid_matches(drafts, roster)
    assert len(out) == MAX_MATCHES and [m.score for m in out] == [60, 50, 40, 30, 20]
    assert out[0].reason == "r"


def test_clean_text_strips_quotes_and_caps() -> None:
    assert clean_text('  "Hello"  ', 100) == "Hello"
    assert clean_text("abcdef", 3) == "abc"
    assert (
        clean_text("## Overview\n**Objective** grow __reach__", 100)
        == "Overview\nObjective grow reach"
    )
