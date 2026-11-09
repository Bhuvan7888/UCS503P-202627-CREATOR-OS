from datetime import date, datetime
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

class CreatorProfileUpdateRequest(BaseModel):
    followers_count: int
    engagement_rate: float
    avg_views_per_week: int | None = None

class GrowthSnapshot(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    creator_id: UUID
    recorded_at: date
    followers_count: int
    engagement_rate: float | None = None
    created_at: datetime

class GrowthSnapshotCreateRequest(BaseModel):
    recorded_at: date
    followers_count: int
    engagement_rate: float | None = None
