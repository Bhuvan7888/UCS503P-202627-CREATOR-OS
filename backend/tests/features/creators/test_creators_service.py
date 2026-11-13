from datetime import UTC, datetime
from uuid import uuid4

import pytest

from features.brands import Brand
from features.creators import Creator, CreatorOnboardRequest, CreatorService
from shared.errors import (
    ValidationError,
)
from tests.fakes.fake_repos import (
    FakeActivityLogRepo,
    FakeBrandRepo,
    FakeCreatorRepo,
)


@pytest.mark.asyncio
async def test_creator_onboarding_writes_activity_log():
    creator_repo = FakeCreatorRepo()
    activity_log_repo = FakeActivityLogRepo()
    service = CreatorService(creator_repo, activity_log_repo)

    brand_id = uuid4()
    actor_id = uuid4()
    req = CreatorOnboardRequest(
        display_name="Test", instagram_handle="@test", niche="tech", follower_tier="nano"
    )

    creator = await service.onboard_creator(req, brand_id, actor_id, "brand")

    # Assert creator created
    assert creator.id in creator_repo.data

    # Assert activity log written
    logs = await activity_log_repo.list_for_brand(brand_id)
    assert len(logs) == 1
    assert logs[0].action == "creator_onboarded"
    assert logs[0].metadata["creator_id"] == str(creator.id)


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
            id=uuid4(),
            display_name="Test",
            instagram_handle="@test",
            niche="tech",
            follower_tier="nano",
            created_at=datetime.now(UTC),
        )
    )

    linked = await service.link_brand(creator.id, str(brand_id))
    assert linked.name == "Verve Skincare"
    assert await creator_repo.is_linked_to_brand(creator.id, brand_id)

    with pytest.raises(ValidationError):
        await service.link_brand(creator.id, "not-a-real-code")

    with pytest.raises(ValidationError):
        await service.link_brand(creator.id, str(uuid4()))
