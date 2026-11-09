from datetime import UTC, date, datetime, timedelta
from uuid import uuid4

import pytest

from features.analytics import AnalyticsService
from features.contracts import Contract
from features.creators import Creator
from features.deals import Deal
from features.payments import Payment
from tests.fakes.fake_repos import (
    FakeContractRepo,
    FakeCreatorRepo,
    FakeDealRepo,
    FakePaymentRepo,
)


@pytest.mark.asyncio
async def test_brand_analytics_aggregates_across_the_board():
    brand_id = uuid4()
    other_brand_id = uuid4()
    creator_id = uuid4()
    now = datetime.now(UTC)

    deal_repo = FakeDealRepo()
    creator_repo = FakeCreatorRepo()
    contract_repo = FakeContractRepo()
    payment_repo = FakePaymentRepo()

    creator = Creator(
        id=creator_id, brand_id=brand_id, display_name="Test Creator",
        instagram_handle="@test", niche="beauty", follower_tier="micro",
        followers_count=50000, engagement_rate=4.0, created_at=now,
    )
    await creator_repo.create(creator)
    await creator_repo.link_brand(creator_id, brand_id)

    deal = Deal(
        id=uuid4(), brand_id=brand_id, creator_id=creator_id,
        campaign_name="Nykaa", contact_email="a@a.com", status="completed",
        created_at=now, updated_at=now,
    )
    await deal_repo.create(deal)

    contract = Contract(
        id=uuid4(), deal_id=deal.id, file_path="contracts/x.pdf", status="signed",
        created_at=now, updated_at=now,
    )
    await contract_repo.create(contract)
    contract_repo.deals_data[deal.id] = brand_id

    # A payment paid this month, tied to the deal via the contract.
    payment = Payment(
        id=uuid4(), contract_id=contract.id, amount_inr=100000, status="paid",
        invoice_number="INV-1", due_date=date.today() - timedelta(days=5),
        paid_at=now, created_at=now, updated_at=now,
    )
    await payment_repo.create(payment)
    payment_repo.contracts_deals_data[contract.id] = brand_id

    # Noise from a different brand that must never leak into the result.
    await deal_repo.create(Deal(
        id=uuid4(), brand_id=other_brand_id, creator_id=uuid4(),
        campaign_name="OtherBrand", contact_email="b@b.com", status="lead",
        created_at=now, updated_at=now,
    ))

    service = AnalyticsService(
        deal_repo=deal_repo, creator_repo=creator_repo, contract_repo=contract_repo,
        payment_repo=payment_repo,
    )

    analytics = await service.get_brand_analytics(brand_id)

    assert analytics.total_creators == 1
    assert analytics.total_deals == 1
    assert analytics.deals_by_status == {"completed": 1}
    assert len(analytics.top_brands) == 1
    assert analytics.top_brands[0].campaign_name == "Nykaa"
    assert analytics.top_brands[0].total_value == 100000.0
    assert analytics.creator_performance[0].display_name == "Test Creator"
    assert analytics.overdue_payments_count == 0  # paid, so not overdue despite past due_date
    assert len(analytics.revenue_by_month) == 1
    assert analytics.revenue_by_month[0].paid == 100000.0
    assert len(analytics.roster_by_niche) == 1
    assert analytics.roster_by_niche[0].avg_engagement_rate == 4.0
