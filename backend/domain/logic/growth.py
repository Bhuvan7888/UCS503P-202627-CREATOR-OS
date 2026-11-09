from features.creators import GrowthSnapshot


def estimate_weekly_growth_rate(snapshots: list[GrowthSnapshot]) -> float | None:
    """Fits a constant weekly compounding rate across the creator's recorded
    follower-count history (oldest to newest). Needs at least two points
    spanning at least a week; returns None when there isn't enough data yet,
    so the caller can fall back to a default assumption."""
    if len(snapshots) < 2:
        return None

    ordered = sorted(snapshots, key=lambda s: s.recorded_at)
    first, last = ordered[0], ordered[-1]
    weeks = (last.recorded_at - first.recorded_at).days / 7
    if weeks <= 0 or first.followers_count <= 0:
        return None

    return (last.followers_count / first.followers_count) ** (1 / weeks) - 1
