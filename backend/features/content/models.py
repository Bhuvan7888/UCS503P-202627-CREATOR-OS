from datetime import date, datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

ContentType = Literal["long_form_video", "post", "reel", "story", "short_form_video"]
ContentStage = Literal["idea", "scripted", "in_production", "scheduled", "published"]
# Planning tags only: Creator OS does not post to these platforms.
Platform = Literal["youtube", "instagram", "x", "linkedin", "facebook"]


class ContentItem(BaseModel):
    id: UUID
    workspace_id: UUID
    title: str
    description: str | None = None
    type: ContentType = "long_form_video"
    pillar: str
    hook: str
    target_platforms: list[Platform] = []
    due_date: date | None = None
    assignee_user_id: UUID | None = None
    stage: ContentStage = "idea"
    created_by: UUID | None = None
    created_at: datetime
    updated_at: datetime


class _ContentFields(BaseModel):
    @field_validator("target_platforms", check_fields=False)
    @classmethod
    def _dedupe(cls, v: list[Platform] | None) -> list[Platform] | None:
        return list(dict.fromkeys(v)) if v is not None else v


class ContentItemCreate(_ContentFields):
    title: str = Field(min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=2000)
    type: ContentType = "long_form_video"
    pillar: str = Field(min_length=1, max_length=120)
    hook: str = Field(min_length=1, max_length=500)
    target_platforms: list[Platform] = []
    due_date: date | None = None
    assignee_user_id: UUID | None = None


class ContentItemUpdate(_ContentFields):
    """Partial update: only fields that are sent change (moving a card sends just `stage`)."""

    title: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=2000)
    type: ContentType | None = None
    pillar: str | None = Field(default=None, min_length=1, max_length=120)
    hook: str | None = Field(default=None, min_length=1, max_length=500)
    target_platforms: list[Platform] | None = None
    due_date: date | None = None
    assignee_user_id: UUID | None = None
    stage: ContentStage | None = None


class Kpi(BaseModel):
    value: int
    # change in items created in the last 30 days vs the 30 days before; None when there's no baseline
    delta_pct: int | None


class ContentStats(BaseModel):
    total: Kpi
    scripted: Kpi
    published: Kpi
    ideas: Kpi
    by_platform: dict[str, int]
