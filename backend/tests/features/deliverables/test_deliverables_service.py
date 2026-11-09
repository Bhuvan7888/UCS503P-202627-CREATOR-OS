from uuid import uuid4

import pytest

from features.deliverables import (
    DeliverableCreateRequest,
    DeliverableService,
    DeliverableStatusUpdateRequest,
)
from shared.errors import (
    PermissionDeniedError,
)
from tests.fakes.fake_repos import (
    FakeActivityLogRepo,
    FakeDeliverableRepo,
)


@pytest.mark.asyncio
async def test_deliverable_valid_transition():
    deliverable_repo = FakeDeliverableRepo()
    activity_log_repo = FakeActivityLogRepo()
    service = DeliverableService(deliverable_repo, activity_log_repo)
    
    brand_id = uuid4()
    deal_id = uuid4()
    actor_id = uuid4()
    
    # Create deliverable
    req_create = DeliverableCreateRequest(deal_id=deal_id, title="Test", description="Desc")
    created = await service.create_deliverable(req_create, brand_id, actor_id, "creator")
    assert created.status == "pending"

    # Walk the full production pipeline — the creator drives their own progress
    for status in ("in_production", "editing", "submitted"):
        req_update = DeliverableStatusUpdateRequest(status=status, note="Here it is")
        updated = await service.update_status(created.id, req_update, actor_id, "creator", brand_id, deal_id, actor_id)
        assert updated.status == status

    # Assert activity logs (1 for create, 3 for the status updates)
    logs = await activity_log_repo.list_for_deal(deal_id)
    assert len(logs) == 4
    assert logs[-1].action == "deliverable_status_updated"
    assert logs[-1].metadata["to_status"] == "submitted"
    assert logs[-1].metadata["note"] == "Here it is"

    # Approving is the brand's call, not the creator's
    approve_req = DeliverableStatusUpdateRequest(status="approved")
    approved = await service.update_status(created.id, approve_req, brand_id, "brand", brand_id, deal_id)
    assert approved.status == "approved"


@pytest.mark.asyncio
async def test_deliverable_status_role_rules():
    deliverable_repo = FakeDeliverableRepo()
    activity_log_repo = FakeActivityLogRepo()
    service = DeliverableService(deliverable_repo, activity_log_repo)

    brand_id, deal_id, creator_id = uuid4(), uuid4(), uuid4()
    req_create = DeliverableCreateRequest(deal_id=deal_id, title="Test", description="Desc")
    created = await service.create_deliverable(req_create, brand_id, creator_id, "creator")

    # The brand may set any status (including production progress) since the status-dropdown change
    moved = await service.update_status(
        created.id, DeliverableStatusUpdateRequest(status="in_production"), brand_id, "brand", brand_id, deal_id
    )
    assert moved.status == "in_production"

    # Creator can't approve their own submission — that's the brand's review call
    with pytest.raises(PermissionDeniedError):
        await service.update_status(
            created.id, DeliverableStatusUpdateRequest(status="approved"), creator_id, "creator", brand_id, deal_id, creator_id
        )


@pytest.mark.asyncio
async def test_deliverable_revert_transitions():
    deliverable_repo = FakeDeliverableRepo()
    activity_log_repo = FakeActivityLogRepo()
    service = DeliverableService(deliverable_repo, activity_log_repo)

    brand_id, deal_id, creator_id = uuid4(), uuid4(), uuid4()
    req_create = DeliverableCreateRequest(deal_id=deal_id, title="Test", description="Desc")
    created = await service.create_deliverable(req_create, brand_id, creator_id, "creator")

    # Advance to in_production -> editing -> submitted
    await service.update_status(created.id, DeliverableStatusUpdateRequest(status="in_production"), creator_id, "creator", brand_id, deal_id, creator_id)
    await service.update_status(created.id, DeliverableStatusUpdateRequest(status="editing"), creator_id, "creator", brand_id, deal_id, creator_id)
    s = await service.update_status(created.id, DeliverableStatusUpdateRequest(status="submitted"), creator_id, "creator", brand_id, deal_id, creator_id)
    assert s.status == "submitted"
    assert s.previous_status == "in_production"

    # Revert submitted -> editing
    r1 = await service.update_status(created.id, DeliverableStatusUpdateRequest(status="editing"), creator_id, "creator", brand_id, deal_id, creator_id)
    assert r1.status == "editing"
    assert r1.previous_status == "in_production"

    # Revert editing -> in_production
    r2 = await service.update_status(created.id, DeliverableStatusUpdateRequest(status="in_production"), creator_id, "creator", brand_id, deal_id, creator_id)
    assert r2.status == "in_production"
    assert r2.previous_status is None

    # Revert in_production -> pending
    r3 = await service.update_status(created.id, DeliverableStatusUpdateRequest(status="pending"), creator_id, "creator", brand_id, deal_id, creator_id)
    assert r3.status == "pending"
    assert r3.previous_status is None

    # Brand requests revision loop
    await service.update_status(created.id, DeliverableStatusUpdateRequest(status="in_production"), creator_id, "creator", brand_id, deal_id, creator_id)
    await service.update_status(created.id, DeliverableStatusUpdateRequest(status="editing"), creator_id, "creator", brand_id, deal_id, creator_id)
    await service.update_status(created.id, DeliverableStatusUpdateRequest(status="submitted"), creator_id, "creator", brand_id, deal_id, creator_id)
    rev = await service.update_status(created.id, DeliverableStatusUpdateRequest(status="revision_requested"), brand_id, "brand", brand_id, deal_id)
    assert rev.status == "revision_requested"

    # Creator mistakenly marks editing, then reverts back to revision_requested
    m = await service.update_status(created.id, DeliverableStatusUpdateRequest(status="editing"), creator_id, "creator", brand_id, deal_id, creator_id)
    assert m.status == "editing"
    assert m.previous_status == "revision_requested"

    rev_back = await service.update_status(created.id, DeliverableStatusUpdateRequest(status="revision_requested"), creator_id, "creator", brand_id, deal_id, creator_id)
    assert rev_back.status == "revision_requested"
    assert rev_back.previous_status is None
