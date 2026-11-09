from datetime import UTC
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


@pytest.mark.asyncio
async def test_invalid_contract_transition():
    # Fully fake-repo-based — proves an invalid transition returns 400 with the
    # typed exception's message, not a 500. No real Supabase credentials needed.
    from datetime import datetime

    from features.auth.dependencies import ActorContext, get_current_brand
    from features.contracts import Contract, ContractService
    from features.contracts.router import get_contract_service
    from tests.fakes.fake_repos import FakeActivityLogRepo, FakeContractRepo

    repo = FakeContractRepo()
    activity_repo = FakeActivityLogRepo()
    service = ContractService(repo, activity_repo)

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
    repo.data[contract_id] = contract

    app.dependency_overrides[get_contract_service] = lambda: service
    app.dependency_overrides[get_current_brand] = lambda: ActorContext(
        user_id=uuid4(), actor_type="brand", brand_id=uuid4()
    )

    # draft -> signed is invalid
    response = client.patch(
        f"/contracts/{contract_id}/status",
        json={"status": "signed"},
    )

    assert response.status_code == 400
    assert "Invalid transition" in response.json()["detail"]

    app.dependency_overrides.clear()
