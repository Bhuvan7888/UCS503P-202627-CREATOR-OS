from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


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


class CreatorOnboardRequest(BaseModel):
    display_name: str
    instagram_handle: str
    niche: str
    follower_tier: str
    followers_count: int | None = None
    engagement_rate: float | None = None
    avg_views_per_week: int | None = None
