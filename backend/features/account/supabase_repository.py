"""Supabase implementation of the account repository."""

import asyncio
import logging
from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from supabase import Client

from features.account.models import NotificationPreferences
from features.demo_mode import DemoFallbackMixin
from shared.supabase_query import run_query

logger = logging.getLogger(__name__)
CONTRACT_BUCKET = "creator-os-assets"
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


class SupabaseAccountEraser:
    """Erases a person completely ("Delete my account").

    Order matters: rows that reference a parent are deleted before it (the older deal tables don't all cascade).
    Deleting the login last cascades to everything keyed on it: owned workspaces (and all their content,
    scripts, CRM deals, approvals, keys, webhooks, notifications, tickets), memberships, preferences, profile.
    Every step is idempotent, so a retry after a failure finishes the job.
    """

    def __init__(self, client: Client):
        self.client = client

    async def _ids(
        self, table: str, column: str, values: list[str], select: str = "id"
    ) -> list[dict[str, Any]]:
        if not values:
            return []
        res = await run_query(self.client.table(table).select(select).in_(column, values))
        return res.data

    async def _delete(self, table: str, column: str, values: list[str]) -> None:
        if values:
            await run_query(self.client.table(table).delete().in_(column, values))

    async def erase(self, user_id: UUID) -> None:
        uid = str(user_id)
        creators = [r["id"] for r in await self._ids("creators", "user_id", [uid])]
        deals = [r["id"] for r in await self._ids("deals", "creator_id", creators)]
        contract_rows = await self._ids(
            "contracts", "deal_id", deals, "id, file_path"
        ) + await self._ids("contracts", "creator_id", creators, "id, file_path")
        contracts = list({r["id"] for r in contract_rows})
        files = sorted({r["file_path"] for r in contract_rows if r.get("file_path")})
        sessions = [r["id"] for r in await self._ids("negotiation_sessions", "deal_id", deals)]

        await self._delete("negotiation_offers", "session_id", sessions)
        await self._delete("negotiation_conversations", "session_id", sessions)
        await self._delete("negotiation_sessions", "id", sessions)
        await self._delete("escalations", "contract_id", contracts)
        await self._delete("clause_cards", "contract_id", contracts)
        await self._delete("payments", "contract_id", contracts)
        await self._delete("deliverables", "deal_id", deals)
        await self._delete("contracts", "id", contracts)
        await self._delete("messages", "creator_id", creators)
        await self._delete("activity_log", "deal_id", deals)
        await self._delete("deals", "id", deals)
        await self._delete("growth_snapshots", "creator_id", creators)
        await self._delete("creator_brand_links", "creator_id", creators)
        await self._delete("creators", "id", creators)
        await self._delete("brand_members", "user_id", [uid])

        # their trail in other people's workspaces, and invitations addressed to them
        await self._delete("audit_log", "actor_user_id", [uid])
        user = await asyncio.to_thread(self.client.auth.admin.get_user_by_id, uid)
        if user.user.email:
            await run_query(
                self.client.table("workspace_invites").delete().ilike("email", user.user.email)
            )

        if files:
            await asyncio.to_thread(self.client.storage.from_(CONTRACT_BUCKET).remove, files)
        await asyncio.to_thread(self.client.auth.admin.delete_user, uid)
        logger.info(
            "Erased account %s (%d deals, %d contracts, %d files)",
            uid,
            len(deals),
            len(contracts),
            len(files),
        )
