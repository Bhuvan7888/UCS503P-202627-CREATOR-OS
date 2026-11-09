"""Benchmarks: market rate percentiles by niche and follower tier.

Public API of this feature. Other packages import from here, never from submodules.
"""

from features.benchmarks.rules import compute_percentiles
from features.benchmarks.service import BenchmarkService

__all__ = [
    "BenchmarkService",
    "compute_percentiles",
]
