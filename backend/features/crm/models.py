from datetime import date, datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

CrmStatus = Literal[
    "prospect", "pending", "negotiating", "signed", "active", "completed", "paid", "cancelled"
]
Priority = Literal["low", "medium", "high"]
CURRENCIES = ("INR", "USD", "EUR", "GBP", "AED", "SGD", "AUD", "CAD", "JPY")
Currency = Literal["INR", "USD", "EUR", "GBP", "AED", "SGD", "AUD", "CAD", "JPY"]


class _DealFields(BaseModel):
    @field_validator("tags", check_fields=False)
    @classmethod
    def _clean_tags(cls, v: list[str] | None) -> list[str] | None:
        if v is None:
            return v
        return list(dict.fromkeys(t.strip() for t in v if t.strip()))


class CrmDealCreate(_DealFields):
    company_name: str = Field(min_length=1, max_length=120)
    contact_name: str | None = Field(default=None, max_length=120)
    contact_email: str | None = Field(default=None, max_length=254)
    phone: str | None = Field(default=None, max_length=40)
    deal_size: float = Field(default=0, ge=0, le=999_999_999_999)
    currency: Currency = "INR"
    status: CrmStatus = "prospect"
    priority: Priority = "medium"
    expected_close_date: date | None = None
    next_follow_up_date: date | None = None
    tags: list[str] = Field(default=[], max_length=20)
    notes: str | None = Field(default=None, max_length=4000)


class CrmDealUpdate(_DealFields):
    """Partial update: only fields that are sent change."""

    company_name: str | None = Field(default=None, min_length=1, max_length=120)
    contact_name: str | None = Field(default=None, max_length=120)
    contact_email: str | None = Field(default=None, max_length=254)
    phone: str | None = Field(default=None, max_length=40)
    deal_size: float | None = Field(default=None, ge=0, le=999_999_999_999)
    currency: Currency | None = None
    status: CrmStatus | None = None
    priority: Priority | None = None
    expected_close_date: date | None = None
    next_follow_up_date: date | None = None
    tags: list[str] | None = Field(default=None, max_length=20)
    notes: str | None = Field(default=None, max_length=4000)


class CrmDeal(CrmDealCreate):
    id: UUID
    workspace_id: UUID
    created_by: UUID | None = None
    created_at: datetime
    updated_at: datetime


class CrmStats(BaseModel):
    total: int
    # no currency conversion: totals are kept per currency
    value_by_currency: dict[str, float]
    closed: int
    conversion_pct: float
    by_status: dict[str, int]
    top_brands: list[tuple[str, int]]
    follow_ups_due: int


class PlatformDeal(BaseModel):
    """A brand deal made with this workspace's creator on Creator OS (read-only in the CRM)."""

    id: UUID
    brand_name: str
    campaign_name: str
    status: str
    value_inr: float | None = None
    updated_at: datetime
