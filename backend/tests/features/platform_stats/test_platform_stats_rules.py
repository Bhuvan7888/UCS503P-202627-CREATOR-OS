from datetime import UTC, date, datetime
from uuid import uuid4

from features.platform_stats.models import PlatformSnapshot
from features.platform_stats.rules import creator_totals, summarize, tier_for

CREATOR = uuid4()


def _snap(
    platform: str, day: date, followers: int, er: float | None = None, views: int | None = None
):
    return PlatformSnapshot(
        id=uuid4(),
        creator_id=CREATOR,
        platform=platform,
        recorded_at=day,
        followers_count=followers,
        engagement_rate=er,
        avg_views=views,
        created_at=datetime.now(UTC),
    )


def test_summary_is_latest_per_platform_with_change_since_previous() -> None:
    rows = summarize(
        [
            _snap("youtube", date(2026, 11, 1), 9_000),
            _snap("instagram", date(2026, 10, 1), 40_000),
            _snap("instagram", date(2026, 11, 15), 42_500),
        ]
    )
    assert [r.platform for r in rows] == ["youtube", "instagram"]  # fixed platform order
    assert (rows[1].followers_count, rows[1].change) == (42_500, 2_500)
    assert rows[1].previous_recorded_at == date(2026, 10, 1)
    assert rows[0].change is None  # first update of that platform


def test_totals_sum_followers_weight_engagement_and_pick_the_tier() -> None:
    rows = summarize(
        [
            _snap("instagram", date(2026, 11, 15), 30_000, er=6.0, views=10_000),
            _snap("youtube", date(2026, 11, 15), 10_000, er=2.0, views=5_000),
            _snap("x", date(2026, 11, 15), 2_000),
        ]
    )
    totals = creator_totals(rows)
    assert totals == {
        "followers_count": 42_000,
        "engagement_rate": 5.0,  # (30k * 6 + 10k * 2) / 40k
        "avg_views_per_week": 15_000,
        "follower_tier": "micro",
    }


def test_tier_boundaries() -> None:
    assert [tier_for(n) for n in (0, 9_999, 10_000, 199_999, 200_000, 999_999, 1_000_000)] == [
        "nano",
        "nano",
        "micro",
        "mid",
        "macro",
        "macro",
        "mega",
    ]
