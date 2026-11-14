"""Supabase implementation of the account repository."""

from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from supabase import Client

from features.account.models import NotificationPreferences
from features.demo_mode import DemoFallbackMixin
from shared.supabase_query import run_query

_PROFILE_FIELDS = ("phone", "location", "timezone", "currency", "bio", "website")


class SupabaseAccountRepo(DemoFallbackMixin):
    _fallback_repo_name = "account_repo"

    def __init__(self, client: Client):
        self.client = client

    async def get_profile(self, user_id: UUID) -> dict[str, Any] | None:
        res = await run_query(
            self.client.table("user_profiles")
            .select(", ".join(_PROFILE_FIELDS))
            .eq("user_id", str(user_id))
        )
        return res.data[0] if res.data else None

    async def save_profile(self, user_id: UUID, fields: dict[str, Any]) -> None:
        await run_query(
            self.client.table("user_profiles").upsert(
                {**fields, "user_id": str(user_id), "updated_at": datetime.now(UTC).isoformat()}
            )
        )

    async def get_preferences(self, user_id: UUID) -> NotificationPreferences | None:
        res = await run_query(
            self.client.table("notification_preferences").select("*").eq("user_id", str(user_id))
        )
        return NotificationPreferences.model_validate(res.data[0]) if res.data else None

    async def save_preferences(self, user_id: UUID, prefs: NotificationPreferences) -> None:
        await run_query(
            self.client.table("notification_preferences").upsert(
                {
                    **prefs.model_dump(mode="json"),
                    "user_id": str(user_id),
                    "updated_at": datetime.now(UTC).isoformat(),
                }
            )
        )
