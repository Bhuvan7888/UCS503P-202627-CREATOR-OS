from datetime import UTC
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


@pytest.mark.asyncio
async def test_payment_mark_paid_400(monkeypatch):
    from datetime import datetime
    from decimal import Decimal

    from features.auth.dependencies import ActorContext, get_current_brand
    from features.contracts import Contract
    from features.deals import Deal
    from features.payments import Payment, PaymentService
    from features.payments.router import get_payment_service
    from tests.fakes.access import use_fake_access_repos
    from tests.fakes.fake_repos import (
        FakeActivityLogRepo,
        FakeContractRepo,
        FakeDealRepo,
        FakePaymentRepo,
    )

    repo = FakePaymentRepo()
    activity_repo = FakeActivityLogRepo()
    service = PaymentService(repo, activity_repo)

    p_id = uuid4()
    contract_id = uuid4()
    brand_id, deal_id = uuid4(), uuid4()
    deal_repo, contract_repo = FakeDealRepo(), FakeContractRepo()
    now = datetime.now(UTC)
    deal_repo.data[deal_id] = Deal(
        id=deal_id,
        brand_id=brand_id,
        creator_id=uuid4(),
        campaign_name="c",
        contact_email="a@b.c",
        status="contracted",
        created_at=now,
        updated_at=now,
    )
    contract_repo.data[contract_id] = Contract(
        id=contract_id, deal_id=deal_id, status="signed", created_at=now, updated_at=now
    )
    use_fake_access_repos(monkeypatch, deal_repo=deal_repo, contract_repo=contract_repo)
    repo.data[p_id] = Payment(
        id=p_id,
        contract_id=contract_id,
        amount_inr=Decimal("1000.0"),
        invoice_number="",
        status="pending",
        due_date=datetime.now(UTC).date(),
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )

    app.dependency_overrides[get_payment_service] = lambda: service
    app.dependency_overrides[get_current_brand] = lambda: ActorContext(
        user_id=uuid4(), actor_type="brand", brand_id=brand_id
    )

    # Happy path
    res = client.patch(
        f"/payments/{contract_id}/mark-paid",
        params={"payment_id": str(p_id), "deal_id": str(uuid4())},
    )
    assert res.status_code == 200
    assert res.json()["status"] == "paid"

    # Second call (400 InvalidStatusTransition)
    res2 = client.patch(
        f"/payments/{contract_id}/mark-paid",
        params={"payment_id": str(p_id), "deal_id": str(uuid4())},
    )
    assert res2.status_code == 400

    app.dependency_overrides.clear()
