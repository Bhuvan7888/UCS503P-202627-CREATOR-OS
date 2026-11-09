from datetime import UTC, datetime
from uuid import uuid4

import pytest

from application.services.contracts import ContractService
from application.services.creators import CreatorService
from application.services.deliverables import DeliverableService
from domain.models.brand import Brand
from domain.models.contract import Contract, ContractStatusUpdateRequest
from domain.models.creator import Creator, CreatorOnboardRequest
from domain.models.deliverable import (
    DeliverableCreateRequest,
    DeliverableStatusUpdateRequest,
)
from shared.errors import (
    InvalidStatusTransition,
    PermissionDeniedError,
    ValidationError,
)
from tests.fakes.fake_repos import (
    FakeActivityLogRepo,
    FakeBrandRepo,
    FakeContractRepo,
    FakeCreatorRepo,
    FakeDeliverableRepo,
)


@pytest.mark.asyncio
async def test_creator_onboarding_writes_activity_log():
    creator_repo = FakeCreatorRepo()
    activity_log_repo = FakeActivityLogRepo()
    service = CreatorService(creator_repo, activity_log_repo)
    
    brand_id = uuid4()
    actor_id = uuid4()
    req = CreatorOnboardRequest(display_name="Test", instagram_handle="@test", niche="tech", follower_tier="nano")
    
    creator = await service.onboard_creator(req, brand_id, actor_id, "brand")
    
    # Assert creator created
    assert creator.id in creator_repo.data
    
    # Assert activity log written
    logs = await activity_log_repo.list_for_brand(brand_id)
    assert len(logs) == 1
    assert logs[0].action == "creator_onboarded"
    assert logs[0].metadata["creator_id"] == str(creator.id)

@pytest.mark.asyncio
async def test_create_contract_persists_and_logs():
    contract_repo = FakeContractRepo()
    activity_log_repo = FakeActivityLogRepo()
    service = ContractService(contract_repo, activity_log_repo)

    deal_id = uuid4()
    brand_id = uuid4()
    actor_id = uuid4()

    contract = await service.create_contract(deal_id, "contracts/abc.pdf", brand_id, actor_id, "brand")

    assert contract.deal_id == deal_id
    assert contract.status == "draft"
    assert contract.file_path == "contracts/abc.pdf"
    assert contract.id in contract_repo.data

    logs = await activity_log_repo.list_for_deal(deal_id)
    assert len(logs) == 1
    assert logs[0].action == "contract_created"

@pytest.mark.asyncio
async def test_contract_valid_transition():
    contract_repo = FakeContractRepo()
    activity_log_repo = FakeActivityLogRepo()
    service = ContractService(contract_repo, activity_log_repo)
    
    brand_id = uuid4()
    contract_id = uuid4()
    contract = Contract(
        id=contract_id,
        deal_id=uuid4(),
        status="draft",
        s3_path=None,
        usage_rights_duration_days=None,
        exclusivity_scope=None,
        revision_limit=None,
        payment_timeline_days=None,
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC)
    )
    contract_repo.data[contract_id] = contract
    
    actor_id = uuid4()
    req = ContractStatusUpdateRequest(status="uploaded")
    updated = await service.update_status(contract_id, req, actor_id, "brand", brand_id)
    
    assert updated.status == "uploaded"
    
    # Assert activity log
    logs = await activity_log_repo.list_for_deal(contract.deal_id)
    assert len(logs) == 1
    assert logs[0].action == "contract_status_updated"
    assert logs[0].metadata["to_status"] == "uploaded"

@pytest.mark.asyncio
async def test_contract_invalid_transition():
    contract_repo = FakeContractRepo()
    activity_log_repo = FakeActivityLogRepo()
    service = ContractService(contract_repo, activity_log_repo)
    
    brand_id = uuid4()
    contract_id = uuid4()
    contract = Contract(
        id=contract_id,
        deal_id=uuid4(),
        status="draft",
        s3_path=None,
        usage_rights_duration_days=None,
        exclusivity_scope=None,
        revision_limit=None,
        payment_timeline_days=None,
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC)
    )
    contract_repo.data[contract_id] = contract
    
    req = ContractStatusUpdateRequest(status="signed")
    with pytest.raises(InvalidStatusTransition):
        await service.update_status(contract_id, req, uuid4(), "brand", brand_id)
    
    # Assert NO activity log
    logs = await activity_log_repo.list_for_deal(contract.deal_id)
    assert len(logs) == 0

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
async def test_deliverable_status_role_gating():
    deliverable_repo = FakeDeliverableRepo()
    activity_log_repo = FakeActivityLogRepo()
    service = DeliverableService(deliverable_repo, activity_log_repo)

    brand_id, deal_id, creator_id = uuid4(), uuid4(), uuid4()
    req_create = DeliverableCreateRequest(deal_id=deal_id, title="Test", description="Desc")
    created = await service.create_deliverable(req_create, brand_id, creator_id, "creator")

    # Brand can't advance production progress — that's the creator's job now
    with pytest.raises(PermissionDeniedError):
        await service.update_status(
            created.id, DeliverableStatusUpdateRequest(status="in_production"), brand_id, "brand", brand_id, deal_id
        )

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

@pytest.mark.asyncio
async def test_creator_profile_update():
    creator_repo = FakeCreatorRepo()
    service = CreatorService(creator_repo, FakeActivityLogRepo())

    req = CreatorOnboardRequest(display_name="Test", instagram_handle="@test", niche="tech", follower_tier="nano")
    creator = await service.onboard_creator(req, uuid4(), uuid4(), "brand")
    assert creator.followers_count is None

    updated = await service.update_profile(creator.id, followers_count=42000, engagement_rate=4.5)
    assert updated.followers_count == 42000
    assert updated.engagement_rate == 4.5

@pytest.mark.asyncio
async def test_creator_link_brand():
    creator_repo = FakeCreatorRepo()
    brand_repo = FakeBrandRepo()
    service = CreatorService(creator_repo, FakeActivityLogRepo(), brand_repo=brand_repo)

    brand_id = uuid4()
    brand = Brand(id=brand_id, name="Verve Skincare", created_at=datetime.now(UTC))
    await brand_repo.create(brand)

    creator = await creator_repo.create(
        Creator(
            id=uuid4(), display_name="Test", instagram_handle="@test", niche="tech",
            follower_tier="nano", created_at=datetime.now(UTC),
        )
    )

    linked = await service.link_brand(creator.id, str(brand_id))
    assert linked.name == "Verve Skincare"
    assert await creator_repo.is_linked_to_brand(creator.id, brand_id)

    with pytest.raises(ValidationError):
        await service.link_brand(creator.id, "not-a-real-code")

    with pytest.raises(ValidationError):
        await service.link_brand(creator.id, str(uuid4()))
