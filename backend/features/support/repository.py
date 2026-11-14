"""Repository port for support tickets."""

from __future__ import annotations

from typing import Any, Protocol, runtime_checkable
from uuid import UUID

from features.support.models import Ticket


@runtime_checkable
class TicketRepo(Protocol):
    async def create(self, ticket: Ticket) -> Ticket: ...
    async def get(self, id: UUID) -> Ticket | None: ...
    async def list_for_user(
        self, workspace_id: UUID, user_id: UUID, limit: int
    ) -> list[Ticket]: ...
    async def update(self, id: UUID, changes: dict[str, Any]) -> Ticket: ...
