from uuid import UUID

from features.account.models import NotificationPreferences, Profile, ProfileSave
from features.account.repository import AccountRepo
from features.workspaces import UserDirectory

DEFAULT_TIMEZONE = "Asia/Kolkata"


class AccountService:
    """The signed-in person's profile and notification preferences (they follow the user, not a workspace)."""

    def __init__(self, repo: AccountRepo, users: UserDirectory):
        self.repo = repo
        self.users = users

    async def profile(self, user_id: UUID) -> Profile:
        name, email = (await self.users.describe([user_id])).get(user_id, ("", None))
        stored = await self.repo.get_profile(user_id) or {}
        return Profile(name=name or "Member", email=email, **stored)

    async def save_profile(self, user_id: UUID, request: ProfileSave) -> Profile:
        # the name lives with the login (so teammates see it everywhere); the rest in user_profiles
        await self.users.set_name(user_id, request.name.strip())
        await self.repo.save_profile(user_id, request.model_dump(exclude={"name"}))
        return await self.profile(user_id)

    async def timezone(self, user_id: UUID) -> str:
        stored = await self.repo.get_profile(user_id) or {}
        return stored.get("timezone") or DEFAULT_TIMEZONE

    async def preferences(self, user_id: UUID) -> NotificationPreferences:
        return await self.repo.get_preferences(user_id) or NotificationPreferences()

    async def save_preferences(
        self, user_id: UUID, prefs: NotificationPreferences
    ) -> NotificationPreferences:
        await self.repo.save_preferences(user_id, prefs)
        return prefs
