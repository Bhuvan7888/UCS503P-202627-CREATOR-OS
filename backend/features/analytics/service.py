import asyncio
from collections import Counter
from datetime import date
from uuid import UUID

from features.analytics.models import BrandAnalytics
from features.analytics.rules import (
    creator_performance,
    overdue_payments,
    payment_totals,
    revenue_by_month,
    roster_by_niche,
    top_campaigns,
)
from features.contracts import ContractRepo
from features.creators import CreatorRepo
from features.deals import DealRepo
from features.payments import PaymentRepo

# Analytics reads the whole brand in one pass rather than paginating, since an
# brand's own roster/deal volume is small enough for this to be cheap.
# ponytail: full-scan aggregation, revisit with a real limit/cursor if a brand
# ever has thousands of deals.
_ANALYTICS_SCAN_LIMIT = 2000


class AnalyticsService:
    def __init__(
        self,
        deal_repo: DealRepo,
        creator_repo: CreatorRepo,
        contract_repo: ContractRepo,
        payment_repo: PaymentRepo,
    ):
        self.deal_repo = deal_repo
        self.creator_repo = creator_repo
        self.contract_repo = contract_repo
        self.payment_repo = payment_repo

    async def get_brand_analytics(self, brand_id: UUID) -> BrandAnalytics:
        deals, creators, contracts, payments = await asyncio.gather(
            self.deal_repo.list_for_brand(brand_id, _ANALYTICS_SCAN_LIMIT, 0),
            self.creator_repo.list_for_brand(brand_id, _ANALYTICS_SCAN_LIMIT, 0),
            self.contract_repo.list_for_brand(brand_id, _ANALYTICS_SCAN_LIMIT, 0),
            self.payment_repo.list_for_brand(brand_id, _ANALYTICS_SCAN_LIMIT, 0),
        )

        campaign_value, creator_value = payment_totals(payments, deals, contracts)
        overdue = overdue_payments(payments, date.today())

        return BrandAnalytics(
            total_creators=len(creators),
            total_deals=len(deals),
            deals_by_status=dict(Counter(d.status for d in deals)),
            revenue_by_month=revenue_by_month(payments),
            top_brands=top_campaigns(deals, campaign_value),
            creator_performance=creator_performance(deals, creators, creator_value),
            overdue_payments_count=len(overdue),
            overdue_payments_total=sum(float(p.amount_inr) for p in overdue),
            roster_by_niche=roster_by_niche(creators),
        )
