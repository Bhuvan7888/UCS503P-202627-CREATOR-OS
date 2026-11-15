from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

FollowerTier = Literal["nano", "micro", "mid", "macro", "mega"]
FOLLOWER_TIERS: tuple[str, ...] = ("nano", "micro", "mid", "macro", "mega")


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


class CreatorProfileUpdate(BaseModel):
    """Creator Settings → Brands → "Your creator profile". Numbers (followers, engagement, views, tier) come from
    Settings → Platform analytics, so there is one place to keep them current."""

    instagram_handle: str = Field(min_length=1, max_length=60)
    niche: str = Field(min_length=1, max_length=60)


class CreatorOnboardRequest(BaseModel):
    display_name: str
    instagram_handle: str
    niche: str
    follower_tier: str
    followers_count: int | None = None
    engagement_rate: float | None = None
    avg_views_per_week: int | None = None
