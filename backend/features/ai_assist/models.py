from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field

from features.content import ContentType

GenerateField = Literal["title", "description", "hook", "outline"]


class AiKnowledgeSave(BaseModel):
    brand: str = Field(default="", max_length=4000)
    audience: str = Field(default="", max_length=4000)
    strategy: str = Field(default="", max_length=4000)
    custom_output_format: str = Field(default="", max_length=4000)


class AiKnowledge(AiKnowledgeSave):
    workspace_id: UUID
    updated_at: datetime | None = None


class ContentDraft(BaseModel):
    """What the user has typed so far (wizard, item editor or script page)."""

    type: ContentType = "long_form_video"
    title: str = Field(default="", max_length=200)
    description: str | None = Field(default=None, max_length=2000)
    pillar: str = Field(default="", max_length=120)
    hook: str = Field(default="", max_length=500)


class GenerateRequest(BaseModel):
    field: GenerateField
    draft: ContentDraft


class GenerateResult(BaseModel):
    text: str


class SuggestionDraft(BaseModel):
    """Structured-output schema for the LLM: one content idea."""

    title: str
    description: str
    pillar: str
    hook: str
    type: ContentType


class Suggestion(SuggestionDraft):
    id: str
    dismissed: bool = False


class SuggestionSet(BaseModel):
    workspace_id: UUID
    suggestions: list[Suggestion] = []
    generated_at: datetime | None = None
