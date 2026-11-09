"""Pure aggregation rules behind the brand analytics dashboard."""

import statistics
from collections import Counter, defaultdict
from datetime import date
from uuid import UUID

from features.analytics.models import (
    CreatorPerformance,
    NicheBreakdown,
    RevenueMonth,
    TopBrand,
)
from features.contracts import Contract
from features.creators import Creator
from features.deals import Deal
from features.payments import Payment

TOP_CAMPAIGNS_LIMIT = 10


def revenue_by_month(payments: list[Payment]) -> list[RevenueMonth]:
    """Paid vs. not-yet-paid invoice totals per calendar month of invoice creation, oldest first."""
    revenue: dict[str, dict[str, float]] = defaultdict(lambda: {"paid": 0.0, "pending": 0.0})
    for p in payments:
        month = p.created_at.strftime("%Y-%m")
        key = "paid" if p.status == "paid" else "pending"
        revenue[month][key] += float(p.amount_inr)
    return [
        RevenueMonth(month=m, paid=v["paid"], pending=v["pending"])
        for m, v in sorted(revenue.items())
    ]


def payment_totals(
    payments: list[Payment], deals: list[Deal], contracts: list[Contract]
) -> tuple[dict[str, float], dict[UUID, float]]:
    """Invoiced value per campaign name and per creator, joined payment → contract → deal."""
    deal_by_id = {d.id: d for d in deals}
    contract_deal_id = {c.id: c.deal_id for c in contracts}
    campaign_value: dict[str, float] = defaultdict(float)
    creator_value: dict[UUID, float] = defaultdict(float)
    for p in payments:
        deal = deal_by_id.get(contract_deal_id.get(p.contract_id))
        if deal:
            campaign_value[deal.campaign_name] += float(p.amount_inr)
            creator_value[deal.creator_id] += float(p.amount_inr)
    return campaign_value, creator_value


def top_campaigns(deals: list[Deal], campaign_value: dict[str, float]) -> list[TopBrand]:
    """Campaigns ranked by invoiced value (top 10)."""
    deal_count = Counter(d.campaign_name for d in deals)
    return sorted(
        (
            TopBrand(
                campaign_name=name, deal_count=count, total_value=campaign_value.get(name, 0.0)
            )
            for name, count in deal_count.items()
        ),
        key=lambda x: x.total_value,
        reverse=True,
    )[:TOP_CAMPAIGNS_LIMIT]


def creator_performance(
    deals: list[Deal], creators: list[Creator], creator_value: dict[UUID, float]
) -> list[CreatorPerformance]:
    """Creators on the roster ranked by invoiced value."""
    creator_by_id = {c.id: c for c in creators}
    deal_count = Counter(d.creator_id for d in deals)
    return sorted(
        (
            CreatorPerformance(
                creator_id=cid,
                display_name=creator_by_id[cid].display_name,
                niche=creator_by_id[cid].niche,
                follower_tier=creator_by_id[cid].follower_tier,
                deal_count=count,
                total_value=creator_value.get(cid, 0.0),
            )
            for cid, count in deal_count.items()
            if cid in creator_by_id
        ),
        key=lambda x: x.total_value,
        reverse=True,
    )


def overdue_payments(payments: list[Payment], today: date) -> list[Payment]:
    """Unpaid invoices whose due date has passed."""
    return [p for p in payments if p.status != "paid" and p.due_date and p.due_date < today]


def roster_by_niche(creators: list[Creator]) -> list[NicheBreakdown]:
    """Creator count and mean engagement rate per (niche, follower tier)."""
    niche_groups: dict[tuple[str, str], list[Creator]] = defaultdict(list)
    for c in creators:
        niche_groups[(c.niche, c.follower_tier)].append(c)
    return [
        NicheBreakdown(
            niche=niche,
            follower_tier=tier,
            creator_count=len(members),
            avg_engagement_rate=(
                statistics.mean(rates)
                if (rates := [m.engagement_rate for m in members if m.engagement_rate is not None])
                else None
            ),
        )
        for (niche, tier), members in niche_groups.items()
    ]
