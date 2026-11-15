"""Pure rules about creator data: how much the stats on file can be trusted."""

from datetime import datetime, timedelta
from typing import Literal

from features.creators.models import FOLLOWER_TIERS, Creator

STATS_STALE_AFTER = timedelta(days=90)
Confidence = Literal["high", "low"]


def stats_as_of(creator: Creator) -> datetime:
    """When the stats on file were last entered (updated by the creator, else when the profile was made)."""
    return creator.stats_updated_at or creator.created_at


def stats_confidence(creator: Creator, now: datetime) -> tuple[Confidence, str]:
    """("high" | "low", a short reason). Stats are self-reported or typed in by the brand — never verified."""
    if creator.followers_count is None or creator.follower_tier not in FOLLOWER_TIERS:
        return "low", "No follower numbers on file"
    source = "self-reported" if creator.user_id else "added by the brand"
    days = max(0, (now - stats_as_of(creator)).days)
    when = "today" if days == 0 else f"{days} day{'s' if days != 1 else ''} ago"
    if now - stats_as_of(creator) > STATS_STALE_AFTER:
        return "low", f"Stats {source} {when} — may be out of date"
    return "high", f"Stats {source} {when}"
