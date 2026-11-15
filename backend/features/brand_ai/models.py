from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class BrandAiProfileSave(BaseModel):
    """Brand Settings → AI knowledge: what every brand AI feature is told about the brand."""

    products: str = Field(default="", max_length=4000)
    audience: str = Field(default="", max_length=4000)
    voice: str = Field(default="", max_length=4000)
    goals: str = Field(default="", max_length=4000)
    guidelines: str = Field(default="", max_length=4000)


class BrandAiProfile(BrandAiProfileSave):
    brand_id: UUID
    updated_at: datetime | None = None


class BriefSave(BaseModel):
    content: str = Field(min_length=1, max_length=20000)


class DealBrief(BriefSave):
    deal_id: UUID
    brand_id: UUID
    updated_at: datetime


class GeneratedText(BaseModel):
    text: str


class MatchRequest(BaseModel):
    campaign: str = Field(min_length=10, max_length=2000)


class CreatorMatchDraft(BaseModel):
    """Structured-output schema for the LLM: one ranked creator."""

    creator_id: str
    score: int
    reason: str


class CreatorMatch(BaseModel):
    creator_id: UUID
    display_name: str
    score: int = Field(ge=0, le=100)
    reason: str


class MatchResult(BaseModel):
    matches: list[CreatorMatch]
