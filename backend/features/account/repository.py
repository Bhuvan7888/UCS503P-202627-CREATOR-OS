"""Repository ports for per-user settings."""

from __future__ import annotations

from typing import Any, Protocol, runtime_checkable
from uuid import UUID

from features.account.models import NotificationPreferences


@runtime_checkable
class AccountRepo(Protocol):
    async def get_profile(self, user_id: UUID) -> dict[str, Any] | None: ...
    async def save_profile(self, user_id: UUID, fields: dict[str, Any]) -> None: ...
    async def get_preferences(self, user_id: UUID) -> NotificationPreferences | None: ...
    async def save_preferences(self, user_id: UUID, prefs: NotificationPreferences) -> None: ...
