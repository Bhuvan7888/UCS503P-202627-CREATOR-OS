import asyncio
from datetime import UTC, datetime
from uuid import UUID, uuid4

from supabase import Client

from domain.interfaces.repositories import CreatorRepo
from domain.models.auth import (
    AuthSession,
    BrandLoginRequest,
    BrandSignupRequest,
    CreatorLoginRequest,
    CreatorSignupRequest,
)
from domain.models.creator import Creator
from features.brands import Brand, BrandMember, BrandMemberRepo, BrandRepo
from shared.errors import ValidationError


class AuthService:
    def __init__(
        self,
        admin_client: Client,
        brand_repo: BrandRepo,
        brand_member_repo: BrandMemberRepo,
        creator_repo: CreatorRepo,
    ):
        self.admin_client = admin_client
        self.brand_repo = brand_repo
        self.brand_member_repo = brand_member_repo
        self.creator_repo = creator_repo

    async def _create_auth_user(self, email: str, password: str) -> UUID:
        try:
            res = await asyncio.to_thread(
                self.admin_client.auth.admin.create_user,
                {"email": email, "password": password, "email_confirm": True}
            )
        except Exception as e:
            raise ValidationError(f"Could not create account: {e}") from e
        return UUID(res.user.id)

    async def _sign_in(self, email: str, password: str):
        try:
            return await asyncio.to_thread(
                self.admin_client.auth.sign_in_with_password,
                {"email": email, "password": password}
            )
        except Exception as e:
            raise ValidationError(f"Invalid email or password: {e}") from e

    async def _delete_auth_user(self, user_id: UUID) -> None:
        # Best-effort compensation: Supabase Auth and Postgres aren't in one
        # transaction, so if the profile row fails to write after the auth
        # user was created, the email would otherwise be permanently stuck
        # ("already registered") on every retry with no way to recover it.
        try:
            await asyncio.to_thread(self.admin_client.auth.admin.delete_user, str(user_id))
        except Exception:
            pass

    async def brand_signup(self, request: BrandSignupRequest) -> AuthSession:
        user_id = await self._create_auth_user(request.email, request.password)

        try:
            brand = Brand(
                id=uuid4(), name=request.brand_name, description=request.description,
                gst_number=None, pan_number=None,
                created_at=datetime.now(UTC)
            )
            created_brand = await self.brand_repo.create(brand)

            member = BrandMember(
                id=uuid4(), brand_id=created_brand.id, user_id=user_id, role="owner",
                created_at=datetime.now(UTC)
            )
            await self.brand_member_repo.create(member)
        except Exception:
            await self._delete_auth_user(user_id)
            raise

        session = await self._sign_in(request.email, request.password)
        return AuthSession(
            access_token=session.session.access_token,
            refresh_token=session.session.refresh_token,
            user_id=user_id,
            role="brand",
            brand_id=created_brand.id,
            brand_name=created_brand.name,
        )

    async def brand_login(self, request: BrandLoginRequest) -> AuthSession:
        session = await self._sign_in(request.email, request.password)
        user_id = UUID(session.user.id)
        member = await self.brand_member_repo.get_by_user_id(user_id)
        if not member:
            raise ValidationError("This account is not linked to a brand.")
        brand = await self.brand_repo.get(member.brand_id)
        return AuthSession(
            access_token=session.session.access_token,
            refresh_token=session.session.refresh_token,
            user_id=user_id,
            role="brand",
            brand_id=member.brand_id,
            brand_name=brand.name if brand else None,
        )

    async def creator_signup(self, request: CreatorSignupRequest) -> AuthSession:
        user_id = await self._create_auth_user(request.email, request.password)

        try:
            creator = Creator(
                id=uuid4(), brand_id=None, user_id=user_id,
                display_name=request.display_name, instagram_handle=request.instagram_handle,
                niche=request.niche, follower_tier=request.follower_tier,
                followers_count=request.followers_count, engagement_rate=request.engagement_rate,
                created_at=datetime.now(UTC)
            )
            created = await self.creator_repo.create(creator)
        except Exception:
            await self._delete_auth_user(user_id)
            raise

        session = await self._sign_in(request.email, request.password)
        return AuthSession(
            access_token=session.session.access_token,
            refresh_token=session.session.refresh_token,
            user_id=user_id,
            role="creator",
            brand_id=None,
            creator_id=created.id,
            display_name=created.display_name,
        )

    async def creator_login(self, request: CreatorLoginRequest) -> AuthSession:
        session = await self._sign_in(request.email, request.password)
        user_id = UUID(session.user.id)
        creator = await self.creator_repo.get_by_user_id(user_id)
        if not creator:
            raise ValidationError("This account is not linked to a creator profile.")
        return AuthSession(
            access_token=session.session.access_token,
            refresh_token=session.session.refresh_token,
            user_id=user_id,
            role="creator",
            brand_id=creator.brand_id,
            creator_id=creator.id,
            display_name=creator.display_name,
        )
