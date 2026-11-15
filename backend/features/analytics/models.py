from uuid import UUID

from pydantic import BaseModel


class RevenueMonth(BaseModel):
    month: str  # YYYY-MM
    paid: float
    pending: float  # unpaid, not yet due
    overdue: float = 0.0  # unpaid and past its due date (same rule as overdue_payments)


class TopBrand(BaseModel):
    campaign_name: str
    deal_count: int
    total_value: float


class CreatorPerformance(BaseModel):
    creator_id: UUID
    display_name: str
    niche: str
    follower_tier: str
    deal_count: int
    total_value: float


class NicheBreakdown(BaseModel):
    niche: str
    follower_tier: str
    creator_count: int
    avg_engagement_rate: float | None = None


class BrandAnalytics(BaseModel):
    total_creators: int
    total_deals: int
    deals_by_status: dict[str, int]
    revenue_by_month: list[RevenueMonth]
    top_brands: list[TopBrand]
    creator_performance: list[CreatorPerformance]
    overdue_payments_count: int
    overdue_payments_total: float
    roster_by_niche: list[NicheBreakdown]
