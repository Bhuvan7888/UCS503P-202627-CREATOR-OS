"""Brand CRM rules: closed deals, conversion and the pipeline overview."""

from collections import Counter, defaultdict
from datetime import date

from features.crm.models import CrmDeal, CrmStats, CrmStatus

STATUSES: tuple[CrmStatus, ...] = (
    "prospect",
    "pending",
    "negotiating",
    "signed",
    "active",
    "completed",
    "paid",
    "cancelled",
)
CLOSED: frozenset[CrmStatus] = frozenset({"completed", "paid"})
TOP_BRANDS = 5
MAX_DEALS_PER_WORKSPACE_VIEW = 1000


def crm_stats(deals: list[CrmDeal], today: date) -> CrmStats:
    value: defaultdict[str, float] = defaultdict(float)
    by_brand: Counter[str] = Counter()
    for d in deals:
        if d.status != "cancelled":
            value[d.currency] += d.deal_size
            by_brand[d.company_name] += 1
    closed = sum(1 for d in deals if d.status in CLOSED)
    return CrmStats(
        total=len(deals),
        value_by_currency=dict(value),
        closed=closed,
        conversion_pct=round(closed * 100 / len(deals), 1) if deals else 0.0,
        by_status={s: sum(1 for d in deals if d.status == s) for s in STATUSES},
        top_brands=by_brand.most_common(TOP_BRANDS),
        follow_ups_due=sum(
            1
            for d in deals
            if d.next_follow_up_date and d.next_follow_up_date <= today and d.status not in CLOSED
        ),
    )
