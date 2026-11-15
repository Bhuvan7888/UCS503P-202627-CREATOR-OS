from datetime import UTC, datetime, timedelta
from uuid import uuid4

from features.creators import Creator, stats_confidence

NOW = datetime(2026, 11, 15, tzinfo=UTC)


def _creator(**kw) -> Creator:
    base = {
        "id": uuid4(),
        "display_name": "A",
        "instagram_handle": "a",
        "niche": "beauty",
        "follower_tier": "micro",
        "followers_count": 40_000,
        "created_at": NOW - timedelta(days=10),
    }
    return Creator(**{**base, **kw})


def test_missing_numbers_are_low_confidence() -> None:
    assert stats_confidence(_creator(followers_count=None), NOW) == (
        "low",
        "No follower numbers on file",
    )
    # Google sign-ups start with an unset tier
    assert stats_confidence(_creator(follower_tier="Not set"), NOW)[0] == "low"


def test_fresh_self_reported_stats_are_high_confidence() -> None:
    c = _creator(user_id=uuid4(), stats_updated_at=NOW)
    assert stats_confidence(c, NOW) == ("high", "Stats self-reported today")
    assert stats_confidence(_creator(user_id=uuid4()), NOW) == (
        "high",
        "Stats self-reported 10 days ago",
    )


def test_old_stats_are_low_confidence_and_say_who_entered_them() -> None:
    c = _creator(created_at=NOW - timedelta(days=120))  # no user_id: the brand typed them in
    assert stats_confidence(c, NOW) == (
        "low",
        "Stats added by the brand 120 days ago — may be out of date",
    )
