from datetime import UTC
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


@pytest.mark.asyncio
async def test_payment_mark_paid_400():
    from datetime import datetime
    from decimal import Decimal

    from features.auth.dependencies import ActorContext, get_current_brand
    from features.payments import Payment, PaymentService
    from features.payments.router import get_payment_service
    from tests.fakes.fake_repos import FakeActivityLogRepo, FakePaymentRepo

    repo = FakePaymentRepo()
    activity_repo = FakeActivityLogRepo()
    service = PaymentService(repo, activity_repo)

    p_id = uuid4()
    contract_id = uuid4()
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
        user_id=uuid4(), actor_type="brand", brand_id=uuid4()
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
