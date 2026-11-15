from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

from features.content import Platform


class PlatformEntry(BaseModel):
    """Today's numbers for one platform, typed in by the creator (no platform API yet)."""

    platform: Platform
    followers_count: int = Field(ge=0, le=1_000_000_000)
    engagement_rate: float | None = Field(default=None, ge=0, le=100)
    avg_views: int | None = Field(default=None, ge=0, le=1_000_000_000)  # average weekly views


class PlatformStatsSave(BaseModel):
    entries: list[PlatformEntry] = Field(min_length=1, max_length=5)

    @field_validator("entries")
    @classmethod
    def _one_row_per_platform(cls, entries: list[PlatformEntry]) -> list[PlatformEntry]:
        if len({e.platform for e in entries}) != len(entries):
            raise ValueError("Each platform can appear only once")
        return entries


class PlatformSnapshot(BaseModel):
    id: UUID
    creator_id: UUID
    platform: Platform
    recorded_at: date
    followers_count: int
    engagement_rate: float | None = None
    avg_views: int | None = None
    created_at: datetime


class PlatformSummary(BaseModel):
    platform: Platform
    followers_count: int
    engagement_rate: float | None
    avg_views: int | None
    recorded_at: date
    # followers gained (or lost) since the previous update of this platform; None on the first update
    change: int | None
    previous_recorded_at: date | None


class CreatorAudience(BaseModel):
    creator_id: UUID
    platforms: list[PlatformSummary]
    total_followers: int
    as_of: date | None  # the most recent update across platforms
