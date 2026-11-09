from datetime import UTC, datetime
from uuid import uuid4

import pytest

from features.deals import Deal
from features.deliverables import Deliverable
from features.demo_mode import DemoStore


def _deal(brand_id, creator_id):
    now = datetime.now(UTC)
    return Deal(
        id=uuid4(),
        brand_id=brand_id,
        creator_id=creator_id,
        campaign_name="New deal",
        contact_email="a@b.c",
        status="lead",
        created_at=now,
        updated_at=now,
    )


def _deliverable(deal_id):
    now = datetime.now(UTC)
    return Deliverable(
        id=uuid4(),
        deal_id=deal_id,
        title="Reel",
        description="x",
        status="pending",
        created_at=now,
        updated_at=now,
    )


@pytest.mark.asyncio
async def test_deliverable_on_deal_created_after_seeding_is_listed_for_brand_and_creator():
    store = DemoStore()
    brand_id, creator_id = uuid4(), uuid4()
    deal = await store.deal_repo.create(_deal(brand_id, creator_id))
    item = await store.deliverable_repo.create(_deliverable(deal.id))

    assert [d.id for d in await store.deliverable_repo.list_for_brand(brand_id)] == [item.id]
    assert [d.id for d in await store.deliverable_repo.list_for_creator(creator_id)] == [item.id]


@pytest.mark.asyncio
async def test_creator_only_sees_deliverables_on_their_own_deals():
    store = DemoStore()
    mine = await store.deal_repo.create(_deal(uuid4(), creator_id := uuid4()))
    other = await store.deal_repo.create(_deal(uuid4(), uuid4()))
    await store.deliverable_repo.create(_deliverable(mine.id))
    await store.deliverable_repo.create(_deliverable(other.id))

    listed = await store.deliverable_repo.list_for_creator(creator_id)
    assert [d.deal_id for d in listed] == [mine.id]


@pytest.mark.asyncio
async def test_payment_on_contract_created_after_seeding_is_listed_for_brand_and_creator():
    from decimal import Decimal

    from features.contracts import Contract
    from features.payments import Payment

    store = DemoStore()
    brand_id, creator_id = uuid4(), uuid4()
    deal = await store.deal_repo.create(_deal(brand_id, creator_id))
    now = datetime.now(UTC)
    contract = await store.contract_repo.create(
        Contract(id=uuid4(), deal_id=deal.id, status="uploaded", created_at=now, updated_at=now)
    )
    payment = await store.payment_repo.create(
        Payment(
            id=uuid4(),
            contract_id=contract.id,
            amount_inr=Decimal("100"),
            invoice_number="INV-1",
            status="pending",
            due_date=now.date(),
            created_at=now,
            updated_at=now,
        )
    )

    assert [p.id for p in await store.payment_repo.list_for_brand(brand_id)] == [payment.id]
    assert [p.id for p in await store.payment_repo.list_for_creator(creator_id)] == [payment.id]
