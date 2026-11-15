"""Pure rules for platform analytics: latest numbers per platform and the totals brands see."""

from collections import defaultdict

from features.platform_stats.models import PlatformSnapshot, PlatformSummary

# same order as the frontend list (shared/constants/platforms.ts)
PLATFORM_ORDER = ["youtube", "instagram", "x", "linkedin", "facebook"]
# Follower tiers by total followers across platforms (upper bounds, exclusive)
TIERS = [(10_000, "nano"), (50_000, "micro"), (200_000, "mid"), (1_000_000, "macro")]


def tier_for(total_followers: int) -> str:
    return next((name for limit, name in TIERS if total_followers < limit), "mega")


def summarize(snapshots: list[PlatformSnapshot]) -> list[PlatformSummary]:
    """Latest snapshot per platform with the follower change since the one before it."""
    by_platform: dict[str, list[PlatformSnapshot]] = defaultdict(list)
    for s in snapshots:
        by_platform[s.platform].append(s)
    out = []
    for platform in PLATFORM_ORDER:
        history = sorted(by_platform.get(platform, []), key=lambda s: s.recorded_at)
        if not history:
            continue
        latest, previous = history[-1], history[-2] if len(history) > 1 else None
        out.append(
            PlatformSummary(
                platform=latest.platform,
                followers_count=latest.followers_count,
                engagement_rate=latest.engagement_rate,
                avg_views=latest.avg_views,
                recorded_at=latest.recorded_at,
                change=latest.followers_count - previous.followers_count if previous else None,
                previous_recorded_at=previous.recorded_at if previous else None,
            )
        )
    return out


def creator_totals(summaries: list[PlatformSummary]) -> dict:
    """The single numbers stored on the creator (Creators table, AI matching): follower total,
    follower-weighted engagement, summed weekly views and the tier for the total."""
    total = sum(s.followers_count for s in summaries)
    rated = [s for s in summaries if s.engagement_rate is not None and s.followers_count > 0]
    weight = sum(s.followers_count for s in rated)
    engagement = (
        round(sum(s.engagement_rate * s.followers_count for s in rated) / weight, 2)  # type: ignore[operator]
        if weight
        else None
    )
    views = [s.avg_views for s in summaries if s.avg_views is not None]
    return {
        "followers_count": total,
        "engagement_rate": engagement,
        "avg_views_per_week": sum(views) if views else None,
        "follower_tier": tier_for(total),
    }
