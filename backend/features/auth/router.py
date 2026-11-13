from fastapi import APIRouter, Depends

from features.auth.models import (
    AuthSession,
    BrandLoginRequest,
    BrandSignupRequest,
    CreatorLoginRequest,
    CreatorSignupRequest,
)
from features.auth.service import AuthService
from features.brands.supabase_repository import (
    SupabaseBrandMemberRepo,
    SupabaseBrandRepo,
)
from features.creators.supabase_repository import SupabaseCreatorRepo
from shared.errors import ValidationError
from shared.http_errors import map_errors
from shared.supabase_client import get_supabase_client

router = APIRouter(prefix="/auth", tags=["auth"])


def get_auth_service() -> AuthService:
    # fresh=True: sign_in_with_password mutates this client's session state,
    # so it must not be the shared/cached client or one user's session would
    # leak onto every other request that happens to reuse it.
    client = get_supabase_client(service_role=True, fresh=True)
    return AuthService(
        admin_client=client,
        brand_repo=SupabaseBrandRepo(client),
        brand_member_repo=SupabaseBrandMemberRepo(client),
        creator_repo=SupabaseCreatorRepo(client),
    )


@router.post("/brand/signup", response_model=AuthSession)
async def brand_signup(
    request: BrandSignupRequest, service: AuthService = Depends(get_auth_service)
):
    with map_errors({ValidationError: 400}):
        return await service.brand_signup(request)


@router.post("/brand/login", response_model=AuthSession)
async def brand_login(request: BrandLoginRequest, service: AuthService = Depends(get_auth_service)):
    from features.demo_mode import authenticate_demo_brand

    demo_session = authenticate_demo_brand(request.email, request.password)
    if demo_session:
        return demo_session

    with map_errors({ValidationError: 400}):
        return await service.brand_login(request)


@router.post("/creator/signup", response_model=AuthSession)
async def creator_signup(
    request: CreatorSignupRequest, service: AuthService = Depends(get_auth_service)
):
    with map_errors({ValidationError: 400}):
        return await service.creator_signup(request)


@router.post("/creator/login", response_model=AuthSession)
async def creator_login(
    request: CreatorLoginRequest, service: AuthService = Depends(get_auth_service)
):
    from features.demo_mode import authenticate_demo_creator

    demo_session = authenticate_demo_creator(request.email, request.password)
    if demo_session:
        return demo_session

    with map_errors({ValidationError: 400}):
        return await service.creator_login(request)
