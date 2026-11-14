from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response

from features.account.models import AccountDeletion, NotificationPreferences, Profile, ProfileSave
from features.account.service import AccountService
from features.account.supabase_repository import SupabaseAccountEraser, SupabaseAccountRepo
from features.auth.dependencies import forget_user, get_current_user_id
from features.demo_mode import is_demo_mode
from features.workspaces.supabase_repository import SupabaseUserDirectory
from shared.supabase_client import get_supabase_client

router = APIRouter(prefix="/me", tags=["account"])


def get_account_service() -> AccountService:
    client = get_supabase_client(service_role=True)
    return AccountService(
        SupabaseAccountRepo(client), SupabaseUserDirectory(client), SupabaseAccountEraser(client)
    )


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


@router.delete("", status_code=204)
async def delete_account(
    request: AccountDeletion,
    user_id: UUID = Depends(get_current_user_id),
    svc: AccountService = Depends(get_account_service),
):
    """Permanently delete the signed-in person and everything that belongs to them."""
    if is_demo_mode():
        raise HTTPException(status_code=409, detail="Demo accounts can't be deleted")
    await svc.delete_account(user_id)
    forget_user(user_id)  # cached sessions stop working at once
    return Response(status_code=204)
