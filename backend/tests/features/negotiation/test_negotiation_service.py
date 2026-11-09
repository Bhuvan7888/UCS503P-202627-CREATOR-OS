from datetime import UTC, datetime
from uuid import uuid4

import pytest

from features.deals import Deal
from features.negotiation import (
    ChecklistState,
    NegotiationService,
    NegotiationSession,
    calculate_base_rate,
    calculate_forecast,
    calculate_range,
    checklist_is_complete,
    generate_script,
)
from tests.fakes.fake_repos import (
    FakeActivityLogRepo,
    FakeDealRepo,
    FakeLLMPort,
    FakeNegotiationSessionRepo,
)


def test_calculate_base_rate():
    # CPM is cost per 1,000 views — a realistic niche CPM (₹40) on a
    # realistic weekly view count (18,000) should land in the thousands,
    # not multiply straight through to the lakhs.
    res1 = calculate_base_rate(18000, 40, 6000, 3000)
    assert res1 == 9720.0

    res2 = calculate_base_rate(1000, 50, 200, 50)
    assert res2 == 300.0


def test_calculate_range():
    low, high = calculate_range(100.0)
    assert low == 85.0
    assert high == 135.0


def test_calculate_forecast():
    base = 100.0
    forecasts = calculate_forecast(base, 0.10, 2)
    assert len(forecasts) == 2

    assert forecasts[0].week == 1
    assert forecasts[0].mid == pytest.approx(100.0)
    assert forecasts[0].low == pytest.approx(85.0)
    assert forecasts[0].high == pytest.approx(135.0)

    assert forecasts[1].week == 2
    assert forecasts[1].mid == pytest.approx(110.0)
    assert forecasts[1].low == pytest.approx(110.0 * 0.85)
    assert forecasts[1].high == pytest.approx(110.0 * 1.35)


def test_checklist_edge_cases():
    # All true
    assert (
        checklist_is_complete(
            ChecklistState(
                usage_rights_duration_set=True,
                exclusivity_scope_set=True,
                revision_limit_set=True,
                payment_timeline_set=True,
            )
        )
        is True
    )

    # 4 flags individually false
    assert (
        checklist_is_complete(
            ChecklistState(
                usage_rights_duration_set=False,
                exclusivity_scope_set=True,
                revision_limit_set=True,
                payment_timeline_set=True,
            )
        )
        is False
    )
    assert (
        checklist_is_complete(
            ChecklistState(
                usage_rights_duration_set=True,
                exclusivity_scope_set=False,
                revision_limit_set=True,
                payment_timeline_set=True,
            )
        )
        is False
    )
    assert (
        checklist_is_complete(
            ChecklistState(
                usage_rights_duration_set=True,
                exclusivity_scope_set=True,
                revision_limit_set=False,
                payment_timeline_set=True,
            )
        )
        is False
    )
    assert (
        checklist_is_complete(
            ChecklistState(
                usage_rights_duration_set=True,
                exclusivity_scope_set=True,
                revision_limit_set=True,
                payment_timeline_set=False,
            )
        )
        is False
    )


def test_generate_script():
    session = NegotiationSession(
        id=uuid4(),
        deal_id=uuid4(),
        status="active",
        views_per_week=10000,
        niche_cpm=50.0,
        follower_tier_multiplier=1.0,
        engagement_rate_adjustment=0.0,
        base_rate=500.0,
        range_low=425.0,
        range_high=675.0,
        checklist=ChecklistState(),
        created_at=datetime.now(UTC),
    )

    s1 = generate_script("lowball_opener", session)
    assert s1 and isinstance(s1, str)
    assert "₹500" in s1
    assert "₹425" in s1
    assert "$" not in s1

    s2 = generate_script("exposure_instead_of_pay", session)
    assert s2 and isinstance(s2, str)

    s3 = generate_script("scope_creep", session)
    assert s3 and isinstance(s3, str)


class MinimalFakeSessionRepo:
    def __init__(self, session: NegotiationSession):
        self.session = session

    async def get(self, id):
        return self.session


class MinimalFakeActivityLogRepo:
    pass


@pytest.mark.asyncio
async def test_generate_script_llm_incomplete_checklist():
    session = NegotiationSession(
        id=uuid4(),
        deal_id=uuid4(),
        status="active",
        views_per_week=10000,
        niche_cpm=50.0,
        follower_tier_multiplier=1.0,
        engagement_rate_adjustment=0.0,
        base_rate=1000.0,
        range_low=850.0,
        range_high=1350.0,
        checklist=ChecklistState(usage_rights_duration_set=False),
        created_at=datetime.now(UTC),
    )
    repo = MinimalFakeSessionRepo(session)
    service = NegotiationService(repo, MinimalFakeActivityLogRepo(), llm_port=FakeLLMPort())  # type: ignore

    with pytest.raises(ValueError, match="Checklist is not complete"):
        await service.generate_script_llm(session.id, "lowball_opener")


@pytest.mark.asyncio
async def test_generate_script_llm_complete_checklist():
    session = NegotiationSession(
        id=uuid4(),
        deal_id=uuid4(),
        status="active",
        views_per_week=10000,
        niche_cpm=50.0,
        follower_tier_multiplier=1.0,
        engagement_rate_adjustment=0.0,
        base_rate=1000.0,
        range_low=850.0,
        range_high=1350.0,
        checklist=ChecklistState(
            usage_rights_duration_set=True,
            exclusivity_scope_set=True,
            revision_limit_set=True,
            payment_timeline_set=True,
        ),
        created_at=datetime.now(UTC),
    )
    repo = MinimalFakeSessionRepo(session)
    llm = FakeLLMPort(explanation="Drafted script.")
    service = NegotiationService(repo, MinimalFakeActivityLogRepo(), llm_port=llm)  # type: ignore

    script = await service.generate_script_llm(session.id, "lowball_opener")
    assert script == "Drafted script."


def _deal_repo_for(deal_id, brand_id) -> FakeDealRepo:
    repo = FakeDealRepo()
    repo.data[deal_id] = Deal(
        id=deal_id,
        brand_id=brand_id,
        creator_id=uuid4(),
        campaign_name="Test Campaign",
        contact_email="a@a.com",
        status="negotiating",
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )
    return repo


@pytest.mark.asyncio
async def test_counter_offer_sender_defaults_and_brand_reply_thread():
    session_repo = FakeNegotiationSessionRepo()

    session = NegotiationSession(
        id=uuid4(),
        deal_id=uuid4(),
        status="active",
        views_per_week=10000,
        niche_cpm=50.0,
        follower_tier_multiplier=1.0,
        engagement_rate_adjustment=0.0,
        base_rate=500.0,
        range_low=425.0,
        range_high=675.0,
        checklist=ChecklistState(
            usage_rights_duration_set=True,
            exclusivity_scope_set=True,
            revision_limit_set=True,
            payment_timeline_set=True,
        ),
        created_at=datetime.now(UTC),
    )
    await session_repo.create(session)
    deal_repo = _deal_repo_for(session.deal_id, uuid4())
    service = NegotiationService(session_repo, FakeActivityLogRepo(), deal_repo=deal_repo)

    # Creator sends an ask; defaults sender to their own actor_type.
    creator_offer = await service.create_counter_offer(
        session.id, 600.0, "Our rate", uuid4(), "creator"
    )
    assert creator_offer.sender == "creator"

    # Brand sends their own counter.
    brand_reply = await service.create_counter_offer(
        session.id, 450.0, "Brand countered lower", uuid4(), "brand"
    )
    assert brand_reply.sender == "brand"

    thread = await service.list_offers(session.id)
    assert [o.sender for o in thread] == ["creator", "brand"]


@pytest.mark.asyncio
async def test_brand_reply_bypasses_checklist_gate():
    session_repo = FakeNegotiationSessionRepo()

    session = NegotiationSession(
        id=uuid4(),
        deal_id=uuid4(),
        status="active",
        views_per_week=10000,
        niche_cpm=50.0,
        follower_tier_multiplier=1.0,
        engagement_rate_adjustment=0.0,
        base_rate=500.0,
        range_low=425.0,
        range_high=675.0,
        checklist=ChecklistState(),  # incomplete
        created_at=datetime.now(UTC),
    )
    await session_repo.create(session)
    deal_repo = _deal_repo_for(session.deal_id, uuid4())
    service = NegotiationService(session_repo, FakeActivityLogRepo(), deal_repo=deal_repo)

    # A creator's own ask is still blocked until the checklist is complete.
    with pytest.raises(ValueError, match="Checklist is not complete"):
        await service.create_counter_offer(session.id, 600.0, None, uuid4(), "creator")

    # The brand's own offer is never gated by the creator's checklist.
    reply = await service.create_counter_offer(
        session.id, 450.0, "Brand called back", uuid4(), "brand"
    )
    assert reply.sender == "brand"
