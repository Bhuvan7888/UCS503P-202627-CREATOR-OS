from uuid import UUID

from fastapi import APIRouter, Depends

from features.account.models import NotificationPreferences, Profile, ProfileSave
from features.account.service import AccountService
from features.account.supabase_repository import SupabaseAccountRepo
from features.auth.dependencies import get_current_user_id
from features.workspaces.supabase_repository import SupabaseUserDirectory
from shared.supabase_client import get_supabase_client

router = APIRouter(prefix="/me", tags=["account"])


def get_account_service() -> AccountService:
    client = get_supabase_client(service_role=True)
    return AccountService(SupabaseAccountRepo(client), SupabaseUserDirectory(client))


@router.get("/profile", response_model=Profile)
async def get_profile(
    user_id: UUID = Depends(get_current_user_id), svc: AccountService = Depends(get_account_service)
):
    return await svc.profile(user_id)


@router.put("/profile", response_model=Profile)
async def save_profile(
    request: ProfileSave,
    user_id: UUID = Depends(get_current_user_id),
    svc: AccountService = Depends(get_account_service),
):
    return await svc.save_profile(user_id, request)


@router.get("/notification-preferences", response_model=NotificationPreferences)
async def get_preferences(
    user_id: UUID = Depends(get_current_user_id), svc: AccountService = Depends(get_account_service)
):
    return await svc.preferences(user_id)


@router.put("/notification-preferences", response_model=NotificationPreferences)
async def save_preferences(
    request: NotificationPreferences,
    user_id: UUID = Depends(get_current_user_id),
    svc: AccountService = Depends(get_account_service),
):
    return await svc.save_preferences(user_id, request)
