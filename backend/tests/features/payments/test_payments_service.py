from datetime import UTC, datetime
from uuid import uuid4

import pytest

from features.payments import (
    Payment,
    PaymentCreateRequest,
    PaymentService,
    create_invoice,
    validate_mark_paid,
    validate_status_change,
)
from shared.errors import InvalidStatusTransition
from tests.fakes.fake_repos import FakeActivityLogRepo, FakePaymentRepo


def test_validate_mark_paid():
    validate_mark_paid("pending")

    with pytest.raises(InvalidStatusTransition):
        validate_mark_paid("paid")

    with pytest.raises(InvalidStatusTransition):
        validate_mark_paid("overdue")


def test_create_invoice():
    inv = create_invoice()
    assert inv.startswith("INV-")
    assert len(inv.split("-")) == 3


@pytest.mark.asyncio
async def test_create_payment_service():
    from decimal import Decimal

    repo = FakePaymentRepo()
    activity_repo = FakeActivityLogRepo()
    service = PaymentService(repo, activity_repo)

    contract_id = uuid4()
    brand_id = uuid4()
    actor_id = uuid4()
    deal_id = uuid4()

    payment = await service.create_payment(
        PaymentCreateRequest(contract_id=contract_id, amount_inr=Decimal("85000.0")),
        brand_id,
        actor_id,
        "brand",
        deal_id,
    )

    assert payment.contract_id == contract_id
    assert payment.status == "pending"
    assert payment.invoice_number.startswith("INV-")
    assert payment.id in repo.data

    logs = await activity_repo.list_for_deal(deal_id)
    assert len(logs) == 1
    assert logs[0].action == "payment_created"


@pytest.mark.asyncio
async def test_mark_paid_service():
    from decimal import Decimal

    repo = FakePaymentRepo()
    activity_repo = FakeActivityLogRepo()
    service = PaymentService(repo, activity_repo)

    p_id = uuid4()
    repo.data[p_id] = Payment(
        id=p_id,
        contract_id=uuid4(),
        amount_inr=Decimal("1000.0"),
        invoice_number="",
        status="pending",
        due_date=datetime.now(UTC).date(),
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )

    brand_id = uuid4()
    actor_id = uuid4()
    deal_id = uuid4()

    updated = await service.mark_paid(p_id, brand_id, actor_id, "brand", deal_id)
    assert updated.status == "paid"
    assert updated.invoice_number is not None
    assert updated.invoice_number.startswith("INV-")

    assert len(activity_repo.data) == 1

    with pytest.raises(InvalidStatusTransition):
        await service.mark_paid(p_id, brand_id, actor_id, "brand", deal_id)


def test_validate_status_change():
    validate_status_change("pending", "paid")
    validate_status_change("paid", "pending")
    validate_status_change("pending", "overdue")

    # Same-status updates are allowed since 8560f05 (status dropdowns); only unknown statuses fail.
    validate_status_change("paid", "paid")
    with pytest.raises(InvalidStatusTransition):
        validate_status_change("paid", "refunded")


@pytest.mark.asyncio
async def test_update_status_service():
    from decimal import Decimal

    repo = FakePaymentRepo()
    activity_repo = FakeActivityLogRepo()
    service = PaymentService(repo, activity_repo)

    p_id = uuid4()
    repo.data[p_id] = Payment(
        id=p_id,
        contract_id=uuid4(),
        amount_inr=Decimal("1000.0"),
        invoice_number="INV-2026-0001",
        status="paid",
        due_date=datetime.now(UTC).date(),
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )

    brand_id = uuid4()
    actor_id = uuid4()
    deal_id = uuid4()

    updated = await service.update_status(p_id, "pending", brand_id, actor_id, "brand", deal_id)
    assert updated.status == "pending"

    # Re-selecting the same status is allowed; an unknown status is rejected.
    again = await service.update_status(p_id, "pending", brand_id, actor_id, "brand", deal_id)
    assert again.status == "pending"
    with pytest.raises(InvalidStatusTransition):
        await service.update_status(p_id, "refunded", brand_id, actor_id, "brand", deal_id)
