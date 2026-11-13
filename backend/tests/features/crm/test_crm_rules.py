from datetime import UTC, date, datetime
from uuid import uuid4

from features.crm.models import CrmDeal
from features.crm.rules import crm_stats

TODAY = date(2026, 11, 16)


def _deal(status="prospect", size=1000.0, currency="INR", company="Nykaa", follow_up=None):
    now = datetime(2026, 11, 1, tzinfo=UTC)
    return CrmDeal(
        id=uuid4(),
        workspace_id=uuid4(),
        company_name=company,
        deal_size=size,
        currency=currency,
        status=status,
        next_follow_up_date=follow_up,
        created_at=now,
        updated_at=now,
    )


def test_kpis_keep_currencies_apart_and_ignore_cancelled_value():
    deals = [
        _deal("paid", 50_000),
        _deal("completed", 20_000),
        _deal("active", 500, "USD", "boAt"),
        _deal("cancelled", 99_999),
    ]
    s = crm_stats(deals, TODAY)
    assert (s.total, s.closed, s.conversion_pct) == (4, 2, 50.0)
    assert s.value_by_currency == {"INR": 70_000, "USD": 500}
    assert (
        s.by_status["paid"] == 1 and s.by_status["cancelled"] == 1 and s.by_status["prospect"] == 0
    )
    assert (s.top_brands[0].name, s.top_brands[0].deals) == ("Nykaa", 2)


def test_follow_ups_due_counts_open_deals_only():
    deals = [
        _deal(follow_up=TODAY),
        _deal(follow_up=date(2026, 12, 1)),
        _deal("paid", follow_up=TODAY),
    ]
    assert crm_stats(deals, TODAY).follow_ups_due == 1
    assert crm_stats([], TODAY).conversion_pct == 0.0
