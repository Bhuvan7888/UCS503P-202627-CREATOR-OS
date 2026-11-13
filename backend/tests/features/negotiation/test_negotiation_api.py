from datetime import UTC
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


@pytest.mark.asyncio
async def test_negotiation_counter_offer_409(monkeypatch):
    from datetime import datetime

    from features.auth.dependencies import ActorContext, get_current_actor
    from features.deals import Deal
    from features.negotiation import (
        ChecklistState,
        NegotiationService,
        NegotiationSession,
    )
    from features.negotiation.router import get_negotiation_service
    from tests.fakes.access import use_fake_access_repos
    from tests.fakes.fake_repos import (
        FakeActivityLogRepo,
        FakeDealRepo,
        FakeNegotiationSessionRepo,
    )

    repo = FakeNegotiationSessionRepo()
    activity_repo = FakeActivityLogRepo()
    deal_repo = FakeDealRepo()
    service = NegotiationService(repo, activity_repo, deal_repo=deal_repo)

    session_id = uuid4()
    deal_id = uuid4()
    creator_id = uuid4()
    use_fake_access_repos(monkeypatch, deal_repo=deal_repo)
    deal_repo.data[deal_id] = Deal(
        id=deal_id,
        brand_id=uuid4(),
        creator_id=creator_id,
        campaign_name="Test Campaign",
        contact_email="a@a.com",
        status="negotiating",
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )
    # Incomplete checklist
    repo.data[session_id] = NegotiationSession(
        id=session_id,
        deal_id=deal_id,
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

    app.dependency_overrides[get_negotiation_service] = lambda: service
    app.dependency_overrides[get_current_actor] = lambda: ActorContext(
        user_id=uuid4(), actor_type="creator", brand_id=uuid4(), creator_id=creator_id
    )

    res = client.post(
        f"/negotiation/sessions/{session_id}/counter-offer",
        json={"amount": 450.0, "message": "Offer"},
    )
    assert res.status_code == 409
    assert "Checklist is not complete" in res.json()["detail"]

    # Complete the checklist
    repo.data[session_id].checklist = ChecklistState(
        usage_rights_duration_set=True,
        exclusivity_scope_set=True,
        revision_limit_set=True,
        payment_timeline_set=True,
    )

    res2 = client.post(
        f"/negotiation/sessions/{session_id}/counter-offer",
        json={"amount": 450.0, "message": "Offer"},
    )
    assert res2.status_code == 200

    app.dependency_overrides.clear()
