from datetime import time
from typing import Literal

from pydantic import BaseModel, Field, field_validator

Category = Literal["task_assignments", "publishing_updates", "deadlines", "workspace_activity"]


class ProfileSave(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    phone: str | None = Field(default=None, max_length=40)
    location: str | None = Field(default=None, max_length=120)
    timezone: str = Field(default="Asia/Kolkata", max_length=64)
    currency: Literal["INR", "USD"] = "INR"
    bio: str | None = Field(default=None, max_length=500)
    website: str | None = Field(default=None, max_length=300, pattern=r"^https?://\S+$")

    @field_validator("timezone")
    @classmethod
    def _known_timezone(cls, v: str) -> str:
        from zoneinfo import available_timezones

        if v not in available_timezones():
            raise ValueError("Unknown timezone")
        return v


class Profile(ProfileSave):
    # managed by the login provider, shown read-only
    email: str | None = None


class AccountDeletion(BaseModel):
    """The person types DELETE to confirm; nothing is kept afterwards."""

    confirm: Literal["DELETE"]


class CategoryPreference(BaseModel):
    in_app: bool = True
    email: bool = False


class NotificationPreferences(BaseModel):
    do_not_disturb: bool = False
    quiet_hours_enabled: bool = False
    quiet_start: time = time(22, 0)
    quiet_end: time = time(7, 0)
    categories: dict[Category, CategoryPreference] = {}
