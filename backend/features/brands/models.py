from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


class Brand(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    name: str
    description: str | None = None
    industry: str | None = None
    website: str | None = None
    gst_number: str | None = None
    pan_number: str | None = None
    created_at: datetime


class BrandProfileUpdate(BaseModel):
    """Brand Settings → Brand profile. Empty optional fields are stored as null."""

    name: str = Field(min_length=1, max_length=120)
    description: str | None = Field(default=None, max_length=2000)
    industry: str | None = Field(default=None, max_length=120)
    website: str | None = Field(default=None, max_length=300)
    gst_number: str | None = Field(default=None, pattern=r"^[0-9]{2}[A-Z0-9]{13}$")
    pan_number: str | None = Field(default=None, pattern=r"^[A-Z]{5}[0-9]{4}[A-Z]$")

    @field_validator("*", mode="before")
    @classmethod
    def _blank_is_none(cls, v: object) -> object:
        if isinstance(v, str):
            v = v.strip()
            return v or None
        return v


class BrandMember(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    brand_id: UUID
    user_id: UUID
    role: str
    created_at: datetime
