from types import SimpleNamespace
from uuid import uuid4

import pytest

from features.auth import (
    AuthService,
    BrandLoginRequest,
    BrandSignupRequest,
    CreatorSignupRequest,
)
from features.auth.models import OAuthCompleteRequest
from tests.fakes.fake_repos import FakeBrandMemberRepo, FakeBrandRepo, FakeCreatorRepo


class StubAdminAuth:
    """Minimal stand-in for supabase Client.auth, enough to unit-test AuthService."""

    def __init__(self):
        self.users_by_email: dict[str, str] = {}
        self.deleted_user_ids: set[str] = set()

    class _Admin:
        def __init__(self, outer):
            self.outer = outer

        def create_user(self, payload):
            user_id = str(uuid4())
            self.outer.users_by_email[payload["email"]] = user_id
            return SimpleNamespace(user=SimpleNamespace(id=user_id))

        def get_user_by_id(self, user_id):
            meta = {"full_name": "Asha Rao"}
            return SimpleNamespace(
                user=SimpleNamespace(id=user_id, email="asha@x.dev", user_metadata=meta)
            )

        def delete_user(self, user_id):
            self.outer.deleted_user_ids.add(str(user_id))
            self.outer.users_by_email = {
                e: u for e, u in self.outer.users_by_email.items() if u != str(user_id)
            }

    @property
    def admin(self):
        return StubAdminAuth._Admin(self)

    def sign_in_with_password(self, payload):
        user_id = self.users_by_email.get(payload["email"])
        if not user_id:
            raise Exception("no such user")
        return SimpleNamespace(
            session=SimpleNamespace(access_token="tok", refresh_token="rtok"),
            user=SimpleNamespace(id=user_id),
        )


class StubClient:
    def __init__(self):
        self.auth = StubAdminAuth()


@pytest.mark.asyncio
async def test_brand_signup_creates_brand_and_member():
    client = StubClient()
    service = AuthService(client, FakeBrandRepo(), FakeBrandMemberRepo(), FakeCreatorRepo())

    session = await service.brand_signup(
        BrandSignupRequest(brand_name="Test Brand", email="a@a.com", password="password123")
    )

    assert session.role == "brand"
    assert session.brand_name == "Test Brand"
    assert session.access_token == "tok"


@pytest.mark.asyncio
async def test_brand_login_after_signup():
    client = StubClient()
    brand_repo, member_repo, creator_repo = (
        FakeBrandRepo(),
        FakeBrandMemberRepo(),
        FakeCreatorRepo(),
    )
    service = AuthService(client, brand_repo, member_repo, creator_repo)

    await service.brand_signup(
        BrandSignupRequest(brand_name="Test Brand", email="a@a.com", password="password123")
    )
    session = await service.brand_login(BrandLoginRequest(email="a@a.com", password="password123"))

    assert session.role == "brand"
    assert session.brand_name == "Test Brand"


@pytest.mark.asyncio
async def test_creator_signup_creates_standalone_creator():
    client = StubClient()
    brand_repo, member_repo, creator_repo = (
        FakeBrandRepo(),
        FakeBrandMemberRepo(),
        FakeCreatorRepo(),
    )
    service = AuthService(client, brand_repo, member_repo, creator_repo)

    creator_session = await service.creator_signup(
        CreatorSignupRequest(
            display_name="Meera",
            instagram_handle="@meera",
            niche="beauty",
            follower_tier="50k-100k",
            followers_count=75000,
            email="c@c.com",
            password="password123",
        )
    )

    assert creator_session.role == "creator"
    assert creator_session.brand_id is None
    assert creator_session.creator_id is not None


class _FailingCreatorRepo(FakeCreatorRepo):
    async def create(self, creator):
        raise RuntimeError("simulated DB failure")


class _FailingBrandRepo(FakeBrandRepo):
    async def create(self, brand):
        raise RuntimeError("simulated DB failure")


@pytest.mark.asyncio
async def test_creator_signup_rolls_back_auth_user_on_failure():
    client = StubClient()
    service = AuthService(client, FakeBrandRepo(), FakeBrandMemberRepo(), _FailingCreatorRepo())

    with pytest.raises(RuntimeError):
        await service.creator_signup(
            CreatorSignupRequest(
                display_name="Meera",
                instagram_handle="@meera",
                niche="beauty",
                follower_tier="50k-100k",
                followers_count=75000,
                email="c@c.com",
                password="password123",
            )
        )

    assert len(client.auth.deleted_user_ids) == 1
    # The email is free again — a retry wouldn't hit "already registered".
    assert "c@c.com" not in client.auth.users_by_email


@pytest.mark.asyncio
async def test_brand_signup_rolls_back_auth_user_on_failure():
    client = StubClient()
    service = AuthService(client, _FailingBrandRepo(), FakeBrandMemberRepo(), FakeCreatorRepo())

    with pytest.raises(RuntimeError):
        await service.brand_signup(
            BrandSignupRequest(brand_name="Test Brand", email="a@a.com", password="password123")
        )

    assert len(client.auth.deleted_user_ids) == 1
    assert "a@a.com" not in client.auth.users_by_email


@pytest.mark.asyncio
async def test_google_sign_in_creates_the_creator_profile_once():
    creator_repo = FakeCreatorRepo()
    service = AuthService(StubClient(), FakeBrandRepo(), FakeBrandMemberRepo(), creator_repo)
    user_id = uuid4()
    first = await service.creator_oauth(user_id, "acc", OAuthCompleteRequest(refresh_token="ref"))
    again = await service.creator_oauth(user_id, "acc2", OAuthCompleteRequest(refresh_token="ref2"))
    assert (first.role, first.display_name, first.access_token) == ("creator", "Asha Rao", "acc")
    assert again.creator_id == first.creator_id and again.refresh_token == "ref2"
