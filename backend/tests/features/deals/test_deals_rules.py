from datetime import UTC, datetime
from uuid import uuid4

from features.deals import Deal, can_access_deal

BRAND, OTHER_BRAND, CREATOR, OTHER_CREATOR = uuid4(), uuid4(), uuid4(), uuid4()


def _deal(brand_id=BRAND):
    now = datetime.now(UTC)
    return Deal(
        id=uuid4(),
        brand_id=brand_id,
        creator_id=CREATOR,
        campaign_name="c",
        contact_email="a@b.c",
        status="lead",
        created_at=now,
        updated_at=now,
    )


def test_owning_brand_and_the_deals_creator_can_access():
    assert can_access_deal(_deal(), "brand", BRAND, None)
    assert can_access_deal(_deal(), "creator", OTHER_BRAND, CREATOR)


def test_other_brands_and_creators_cannot():
    assert not can_access_deal(_deal(), "brand", OTHER_BRAND, None)
    assert not can_access_deal(_deal(), "creator", BRAND, OTHER_CREATOR)


def test_a_brand_cannot_access_a_creators_own_unlinked_deal():
    assert not can_access_deal(_deal(brand_id=None), "brand", None, None)
