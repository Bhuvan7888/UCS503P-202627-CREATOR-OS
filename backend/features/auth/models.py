from typing import Literal
from uuid import UUID

from pydantic import BaseModel


class BrandSignupRequest(BaseModel):
    brand_name: str
    description: str | None = None
    email: str
    password: str


class BrandLoginRequest(BaseModel):
    email: str
    password: str


class CreatorSignupRequest(BaseModel):
    display_name: str
    instagram_handle: str
    niche: str
    follower_tier: str
    followers_count: int
    engagement_rate: float | None = None
    email: str
    password: str


class CreatorLoginRequest(BaseModel):
    email: str
    password: str


class LinkBrandRequest(BaseModel):
    invite_code: str


class AuthSession(BaseModel):
    access_token: str
    refresh_token: str
    user_id: UUID
    role: Literal["brand", "creator"]
    brand_id: UUID | None = None
    brand_name: str | None = None
    creator_id: UUID | None = None
    display_name: str | None = None
