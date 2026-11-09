"""Analytics: brand-level revenue and pipeline aggregates.

Public API of this feature. Other packages import from here, never from submodules.
"""

from features.analytics.service import AnalyticsService

__all__ = [
    "AnalyticsService",
]
