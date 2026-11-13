"""Content pipeline rules: stage order and the Home KPIs."""

from collections import Counter
from collections.abc import Callable
from datetime import datetime, timedelta

from features.content.models import ContentItem, ContentStage, ContentStats, Kpi

STAGES: tuple[ContentStage, ...] = ("idea", "scripted", "in_production", "scheduled", "published")
KPI_WINDOW = timedelta(days=30)
# Upper bound for one workspace's board (MVP scale); the list endpoint never returns more.
MAX_ITEMS_PER_WORKSPACE_VIEW = 1000


def is_scripted(item: ContentItem) -> bool:
    # Until scripts exist (Phase 3), "scripted" means the item has moved past the idea stage.
    return item.stage != "idea"


def _kpi(items: list[ContentItem], keep: Callable[[ContentItem], bool], now: datetime) -> Kpi:
    kept = [i for i in items if keep(i)]
    recent = sum(1 for i in kept if i.created_at > now - KPI_WINDOW)
    previous = sum(1 for i in kept if now - 2 * KPI_WINDOW < i.created_at <= now - KPI_WINDOW)
    delta = round((recent - previous) * 100 / previous) if previous else None
    return Kpi(value=len(kept), delta_pct=delta)


def content_stats(items: list[ContentItem], now: datetime) -> ContentStats:
    platforms = Counter[str](p for i in items for p in i.target_platforms)
    return ContentStats(
        total=_kpi(items, lambda i: True, now),
        scripted=_kpi(items, is_scripted, now),
        published=_kpi(items, lambda i: i.stage == "published", now),
        ideas=_kpi(items, lambda i: i.stage == "idea", now),
        by_platform=dict(platforms),
    )
