from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

FollowerTier = Literal["nano", "micro", "mid", "macro", "mega"]


class Creator(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    brand_id: UUID | None = None
    user_id: UUID | None = None
    display_name: str
    instagram_handle: str
    niche: str
    follower_tier: str
    followers_count: int | None = None
    engagement_rate: float | None = None
    avg_views_per_week: int | None = None
    created_at: datetime
    # last time the creator updated their stats themselves; None = as entered at sign-up / onboarding
    stats_updated_at: datetime | None = None


class CreatorStatsUpdate(BaseModel):
    """Creator Settings → Brands → "Your creator stats": what brands (and AI matching) see."""

    instagram_handle: str = Field(min_length=1, max_length=60)
    niche: str = Field(min_length=1, max_length=60)
    follower_tier: FollowerTier
    followers_count: int = Field(ge=0, le=1_000_000_000)
    engagement_rate: float | None = Field(default=None, ge=0, le=100)
    avg_views_per_week: int | None = Field(default=None, ge=0, le=1_000_000_000)


class CreatorOnboardRequest(BaseModel):
    display_name: str
    instagram_handle: str
    niche: str
    follower_tier: str
    followers_count: int | None = None
    engagement_rate: float | None = None
    avg_views_per_week: int | None = None
