from datetime import UTC, datetime
from uuid import uuid4

import pytest

from features.deals import DealCreateRequest, DealService
from features.negotiation import ChecklistState, NegotiationSession
from shared.errors import NotFoundError, PermissionDeniedError
from tests.fakes.fake_repos import (
    FakeActivityLogRepo,
    FakeDealRepo,
    FakeNegotiationSessionRepo,
)


@pytest.mark.asyncio
async def test_create_deal_persists_and_logs():
    deal_repo = FakeDealRepo()
    activity_log_repo = FakeActivityLogRepo()
    service = DealService(deal_repo, activity_log_repo)

    brand_id = uuid4()
    actor_id = uuid4()
    creator_id = uuid4()

    deal = await service.create_deal(
        DealCreateRequest(
            creator_id=creator_id,
            campaign_name="Nykaa",
            contact_email="brand@nykaa.com"
        ),
        brand_id,
        actor_id,
        "brand"
    )

    assert deal.brand_id == brand_id
    assert deal.creator_id == creator_id
    assert deal.status == "lead"

    logs = await activity_log_repo.list_for_brand(brand_id)
    assert len(logs) == 1
    assert logs[0].action == "deal_created"


@pytest.mark.asyncio
async def test_list_for_brand_filters_by_brand():
    deal_repo = FakeDealRepo()
    activity_log_repo = FakeActivityLogRepo()
    service = DealService(deal_repo, activity_log_repo)

    brand_id = uuid4()
    other_brand_id = uuid4()

    await service.create_deal(
        DealCreateRequest(creator_id=uuid4(), campaign_name="Nykaa", contact_email="a@a.com"),
        brand_id, uuid4(), "brand"
    )
    await service.create_deal(
        DealCreateRequest(creator_id=uuid4(), campaign_name="boAt", contact_email="b@b.com"),
        other_brand_id, uuid4(), "brand"
    )

    deals = await service.list_for_brand(brand_id)
    assert len(deals) == 1
    assert deals[0].campaign_name == "Nykaa"


@pytest.mark.asyncio
async def test_update_status_rejects_non_owner():
    deal_repo = FakeDealRepo()
    service = DealService(deal_repo, FakeActivityLogRepo())

    brand_id = uuid4()
    creator_id = uuid4()
    deal = await service.create_deal(
        DealCreateRequest(creator_id=creator_id, campaign_name="Nykaa", contact_email="a@a.com"),
        brand_id, uuid4(), "brand"
    )

    with pytest.raises(PermissionDeniedError):
        await service.update_status(deal.id, "negotiating", uuid4(), "creator", None, uuid4())

    with pytest.raises(NotFoundError):
        await service.update_status(uuid4(), "negotiating", uuid4(), "creator", None, creator_id)


@pytest.mark.asyncio
async def test_update_status_allows_owning_creator_and_logs():
    deal_repo = FakeDealRepo()
    activity_log_repo = FakeActivityLogRepo()
    service = DealService(deal_repo, activity_log_repo)

    brand_id = uuid4()
    creator_id = uuid4()
    deal = await service.create_deal(
        DealCreateRequest(creator_id=creator_id, campaign_name="Nykaa", contact_email="a@a.com"),
        brand_id, uuid4(), "brand"
    )

    updated = await service.update_status(deal.id, "negotiating", uuid4(), "creator", None, creator_id)
    assert updated.status == "negotiating"

    logs = await activity_log_repo.list_for_deal(deal.id)
    assert logs[-1].action == "deal_status_updated"
    assert logs[-1].metadata["to_status"] == "negotiating"


@pytest.mark.asyncio
async def test_weekly_completed_value_buckets_by_week():
    deal_repo = FakeDealRepo()
    session_repo = FakeNegotiationSessionRepo()
    service = DealService(deal_repo, FakeActivityLogRepo(), negotiation_session_repo=session_repo)

    creator_id = uuid4()
    deal = await service.create_deal(
        DealCreateRequest(creator_id=creator_id, campaign_name="Nykaa", contact_email="a@a.com"),
        uuid4(), uuid4(), "brand"
    )
    deal_repo.data[deal.id].status = "completed"
    deal_repo.data[deal.id].updated_at = datetime.now(UTC)

    await session_repo.create(NegotiationSession(
        id=uuid4(), deal_id=deal.id, status="active",
        views_per_week=10000, niche_cpm=50.0, follower_tier_multiplier=1.0, engagement_rate_adjustment=0.0,
        base_rate=500000.0, range_low=425000.0, range_high=675000.0,
        checklist=ChecklistState(), created_at=datetime.now(UTC)
    ))

    points = await service.get_weekly_completed_value("creator", creator_id, weeks=4)
    assert len(points) == 4
    assert points[-1].value == 500000.0
    assert sum(p.value for p in points[:-1]) == 0.0
