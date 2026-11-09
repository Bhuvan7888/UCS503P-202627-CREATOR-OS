from datetime import date, datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict

DealStatus = Literal["lead", "negotiating", "contracted", "in_production", "completed", "cancelled"]


class Deal(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    brand_id: UUID | None = None
    creator_id: UUID
    campaign_name: str
    contact_email: str
    status: str
    value_inr: float | None = None
    brand_viewed_at: datetime | None = None
    created_at: datetime
    updated_at: datetime


class DealCreateRequest(BaseModel):
    creator_id: UUID
    campaign_name: str
    contact_email: str
    brand_id: UUID | None = None
    value_inr: float | None = None


class DealStatusUpdateRequest(BaseModel):
    status: DealStatus


class WeeklyValuePoint(BaseModel):
    week_start: date
    value: float
