"""Platform analytics: per-platform followers, engagement and weekly views that creators update by hand (dated
snapshots) until platform APIs are connected; saving refreshes the creator totals brands and AI matching use.

Public API of this feature. Other packages import from here, never from submodules.
"""

from features.platform_stats.models import CreatorAudience, PlatformSnapshot
from features.platform_stats.service import PlatformStatsService

__all__ = ["CreatorAudience", "PlatformSnapshot", "PlatformStatsService"]
