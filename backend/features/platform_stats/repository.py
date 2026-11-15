"""Repository port for platform analytics snapshots."""

from __future__ import annotations

from typing import Protocol, runtime_checkable
from uuid import UUID

from features.platform_stats.models import PlatformSnapshot


@runtime_checkable
class PlatformSnapshotRepo(Protocol):
    async def list_for_creator(self, creator_id: UUID) -> list[PlatformSnapshot]: ...
    async def upsert_many(self, snapshots: list[PlatformSnapshot]) -> None:
        """One row per creator, platform and day: saving twice on a day replaces that day's numbers."""
        ...
