"""Repository port (Protocol) for rate benchmarks."""

from __future__ import annotations

from typing import Protocol, runtime_checkable


@runtime_checkable
class RateBenchmarkRepo(Protocol):
    async def get_historical_rates(self, niche: str, follower_tier: str) -> list[float]: ...
