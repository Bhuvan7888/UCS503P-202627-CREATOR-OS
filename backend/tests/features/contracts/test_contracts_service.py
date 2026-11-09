from datetime import UTC, datetime
from uuid import uuid4

import pytest

from features.contracts import Contract, ContractService, ContractStatusUpdateRequest
from shared.errors import (
    InvalidStatusTransition,
)
from tests.fakes.fake_repos import (
    FakeActivityLogRepo,
    FakeContractRepo,
)


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
async def test_contract_rejected_transition_raises_and_does_not_log(monkeypatch):
    # Since 8560f05 every move between known statuses is allowed, so force the rule to reject.
    monkeypatch.setattr("features.contracts.service.is_valid_contract_transition", lambda *_: False)
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
