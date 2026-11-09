from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class ChecklistState(BaseModel):
    usage_rights_duration_set: bool = False
    exclusivity_scope_set: bool = False
    revision_limit_set: bool = False
    payment_timeline_set: bool = False

class NegotiationOffer(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    session_id: UUID
    amount: float
    message: str | None = None
    sender: Literal['creator', 'brand']
    sent_at: datetime

class NegotiationSession(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    deal_id: UUID
    status: str
    views_per_week: int
    niche_cpm: float
    follower_tier_multiplier: float
    engagement_rate_adjustment: float
    base_rate: float
    range_low: float
    range_high: float
    checklist: ChecklistState
    created_at: datetime

class NegotiationSessionCreate(BaseModel):
    deal_id: UUID
    views_per_week: int
    niche_cpm: float
    follower_tier_multiplier: float
    engagement_rate_adjustment: float

class RateRangeOut(BaseModel):
    base_rate: float
    range_low: float
    range_high: float

class ForecastPoint(BaseModel):
    week: int
    low: float
    mid: float
    high: float

class CounterOfferRequest(BaseModel):
    amount: float
    message: str | None = None

class ScriptGenerateRequest(BaseModel):
    session_id: UUID
    kind: str
    use_llm: bool = True

class NegotiationConversation(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    session_id: UUID
    brand_name: str
    conversation_text: str
    ai_suggestion: str | None = None
    created_at: datetime

class NegotiationConversationCreateRequest(BaseModel):
    brand_name: str
    conversation_text: str
