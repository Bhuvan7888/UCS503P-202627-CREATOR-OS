"""Repository port for publish requests."""

from __future__ import annotations

from typing import Any, Protocol, runtime_checkable
from uuid import UUID

from features.approvals.models import PublishRequest


@runtime_checkable
class PublishRequestRepo(Protocol):
    async def create(self, request: PublishRequest) -> PublishRequest:
        """Raises DuplicateError when the item already has a pending request."""
        ...

    async def get(self, id: UUID) -> PublishRequest | None: ...
    async def list_for_workspace(self, workspace_id: UUID, limit: int) -> list[PublishRequest]: ...
    async def decide(self, id: UUID, changes: dict[str, Any]) -> PublishRequest | None:
        """Apply the decision only if the request is still pending; None if it was already decided."""
        ...
