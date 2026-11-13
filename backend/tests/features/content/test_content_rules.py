from datetime import UTC, datetime, timedelta
from uuid import uuid4

from features.content import ContentItem
from features.content.rules import content_stats

NOW = datetime(2026, 11, 13, tzinfo=UTC)


def _item(stage="idea", days_ago=1, platforms=()):
    created = NOW - timedelta(days=days_ago)
    return ContentItem(
        id=uuid4(),
        workspace_id=uuid4(),
        title="t",
        pillar="p",
        hook="h",
        stage=stage,
        target_platforms=list(platforms),
        created_at=created,
        updated_at=created,
    )


def test_counts_by_stage_and_platform():
    stats = content_stats(
        [
            _item("idea", platforms=["youtube"]),
            _item("scripted", platforms=["youtube", "x"]),
            _item("published"),
        ],
        NOW,
    )
    assert (stats.total.value, stats.ideas.value, stats.scripted.value, stats.published.value) == (
        3,
        1,
        2,
        1,
    )
    assert stats.by_platform == {"youtube": 2, "x": 1}


def test_delta_compares_last_30_days_with_the_30_before():
    items = [_item(days_ago=5), _item(days_ago=6), _item(days_ago=40)]
    assert content_stats(items, NOW).total.delta_pct == 100  # 2 vs 1
    assert content_stats([_item(days_ago=5)], NOW).total.delta_pct is None  # no baseline
    assert content_stats([], NOW).total.value == 0


def test_an_idea_with_a_saved_script_counts_as_scripted():
    idea = _item("idea")
    assert content_stats([idea], NOW).scripted.value == 0
    assert content_stats([idea], NOW, frozenset({idea.id})).scripted.value == 1


def test_scheduling_moves_early_items_to_scheduled_and_publishing_stamps_the_time():
    from features.content.rules import apply_stage_rules

    when = NOW + timedelta(days=3)
    assert apply_stage_rules(_item("scripted"), {"scheduled_at": when}, NOW)["stage"] == "scheduled"
    assert "stage" not in apply_stage_rules(_item("published"), {"scheduled_at": when}, NOW)
    published = apply_stage_rules(_item("scheduled"), {"stage": "published"}, NOW)
    assert published["published_at"] == NOW
    back = _item("published").model_copy(update={"published_at": NOW})
    assert apply_stage_rules(back, {"stage": "idea"}, NOW)["published_at"] is None
