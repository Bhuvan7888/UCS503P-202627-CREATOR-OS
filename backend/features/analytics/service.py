import asyncio
import statistics
from collections import Counter, defaultdict
from datetime import date
from uuid import UUID

from domain.interfaces.repositories import ContractRepo
from features.analytics.models import (
    BrandAnalytics,
    CreatorPerformance,
    NicheBreakdown,
    RevenueMonth,
    TopBrand,
)
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

        creator_by_id = {c.id: c for c in creators}
        deal_by_id = {d.id: d for d in deals}
        contract_deal_id = {c.id: c.deal_id for c in contracts}

        deals_by_status = dict(Counter(d.status for d in deals))

        revenue: dict[str, dict[str, float]] = defaultdict(lambda: {"paid": 0.0, "pending": 0.0})
        for p in payments:
            month = p.created_at.strftime("%Y-%m")
            key = "paid" if p.status == "paid" else "pending"
            revenue[month][key] += float(p.amount_inr)
        revenue_by_month = [
            RevenueMonth(month=m, paid=v["paid"], pending=v["pending"]) for m, v in sorted(revenue.items())
        ]

        brand_deal_count = Counter(d.campaign_name for d in deals)
        brand_value: dict[str, float] = defaultdict(float)
        creator_value: dict[UUID, float] = defaultdict(float)
        for p in payments:
            deal = deal_by_id.get(contract_deal_id.get(p.contract_id))
            if deal:
                brand_value[deal.campaign_name] += float(p.amount_inr)
                creator_value[deal.creator_id] += float(p.amount_inr)

        top_brands = sorted(
            (
                TopBrand(campaign_name=b, deal_count=count, total_value=brand_value.get(b, 0.0))
                for b, count in brand_deal_count.items()
            ),
            key=lambda x: x.total_value,
            reverse=True,
        )[:10]

        creator_deal_count = Counter(d.creator_id for d in deals)
        creator_performance = sorted(
            (
                CreatorPerformance(
                    creator_id=cid,
                    display_name=creator_by_id[cid].display_name,
                    niche=creator_by_id[cid].niche,
                    follower_tier=creator_by_id[cid].follower_tier,
                    deal_count=count,
                    total_value=creator_value.get(cid, 0.0),
                )
                for cid, count in creator_deal_count.items()
                if cid in creator_by_id
            ),
            key=lambda x: x.total_value,
            reverse=True,
        )


        today = date.today()
        overdue = [p for p in payments if p.status != "paid" and p.due_date and p.due_date < today]

        niche_groups: dict[tuple[str, str], list] = defaultdict(list)
        for c in creators:
            niche_groups[(c.niche, c.follower_tier)].append(c)
        roster_by_niche = [
            NicheBreakdown(
                niche=niche,
                follower_tier=tier,
                creator_count=len(members),
                avg_engagement_rate=(
                    statistics.mean(rates) if (rates := [m.engagement_rate for m in members if m.engagement_rate is not None]) else None
                ),
            )
            for (niche, tier), members in niche_groups.items()
        ]

        return BrandAnalytics(
            total_creators=len(creators),
            total_deals=len(deals),
            deals_by_status=deals_by_status,
            revenue_by_month=revenue_by_month,
            top_brands=top_brands,
            creator_performance=creator_performance,
            overdue_payments_count=len(overdue),
            overdue_payments_total=sum(float(p.amount_inr) for p in overdue),
            roster_by_niche=roster_by_niche,
        )
