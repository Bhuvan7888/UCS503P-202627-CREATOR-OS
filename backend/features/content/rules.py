"""Content pipeline rules: stage order and the Home KPIs."""

from collections import Counter
from collections.abc import Callable
from datetime import datetime, timedelta
from uuid import UUID

from features.content.models import ContentItem, ContentStage, ContentStats, Kpi

STAGES: tuple[ContentStage, ...] = ("idea", "scripted", "in_production", "scheduled", "published")
KPI_WINDOW = timedelta(days=30)
# Upper bound for one workspace's board (MVP scale); the list endpoint never returns more.
MAX_ITEMS_PER_WORKSPACE_VIEW = 1000


def apply_stage_rules(item: ContentItem, changes: dict, now: datetime) -> dict:
    """Keep stage, schedule and publish time consistent for a PATCH.

    Scheduling an item that hasn't reached Scheduled moves it there; moving to Published stamps
    published_at (once); moving back from Published clears it.
    """
    changes = dict(changes)
    stage = changes.get("stage", item.stage)
    if (
        changes.get("scheduled_at")
        and "stage" not in changes
        and STAGES.index(stage) < STAGES.index("scheduled")
    ):
        stage = changes["stage"] = "scheduled"
    if stage == "published" and item.published_at is None:
        changes["published_at"] = now
    elif stage != "published" and item.published_at is not None:
        changes["published_at"] = None
    return changes


def is_scripted(item: ContentItem, scripted_ids: frozenset[UUID]) -> bool:
    # Has a saved script, or was moved past the idea stage on the board.
    return item.id in scripted_ids or item.stage != "idea"


def _kpi(items: list[ContentItem], keep: Callable[[ContentItem], bool], now: datetime) -> Kpi:
    kept = [i for i in items if keep(i)]
    recent = sum(1 for i in kept if i.created_at > now - KPI_WINDOW)
    previous = sum(1 for i in kept if now - 2 * KPI_WINDOW < i.created_at <= now - KPI_WINDOW)
    delta = round((recent - previous) * 100 / previous) if previous else None
    return Kpi(value=len(kept), delta_pct=delta)


def content_stats(
    items: list[ContentItem], now: datetime, scripted_ids: frozenset[UUID] = frozenset()
) -> ContentStats:
    platforms = Counter[str](p for i in items for p in i.target_platforms)
    return ContentStats(
        total=_kpi(items, lambda i: True, now),
        scripted=_kpi(items, lambda i: is_scripted(i, scripted_ids), now),
        published=_kpi(items, lambda i: i.stage == "published", now),
        ideas=_kpi(items, lambda i: i.stage == "idea", now),
        by_platform=dict(platforms),
    )
