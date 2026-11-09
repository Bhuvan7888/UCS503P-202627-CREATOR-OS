"""Repository ports (Protocols) for negotiation sessions and conversations."""

from __future__ import annotations

from typing import Protocol, runtime_checkable
from uuid import UUID

from features.negotiation.models import (
    ChecklistState,
    NegotiationConversation,
    NegotiationOffer,
    NegotiationSession,
)


@runtime_checkable
class NegotiationSessionRepo(Protocol):
    async def create(self, session: NegotiationSession) -> NegotiationSession: ...
    async def get(self, id: UUID) -> NegotiationSession | None: ...
    async def list_for_brand(
        self, brand_id: UUID, limit: int = 50, offset: int = 0
    ) -> list[NegotiationSession]: ...
    async def list_for_creator(
        self, creator_id: UUID, limit: int = 50, offset: int = 0
    ) -> list[NegotiationSession]: ...
    async def update_checklist(self, id: UUID, checklist: ChecklistState) -> NegotiationSession: ...
    async def save_offer(self, offer: NegotiationOffer) -> NegotiationOffer: ...
    async def list_offers(self, session_id: UUID) -> list[NegotiationOffer]: ...


@runtime_checkable
class NegotiationConversationRepo(Protocol):
    async def create(self, conversation: NegotiationConversation) -> NegotiationConversation: ...
    async def list_for_session(self, session_id: UUID) -> list[NegotiationConversation]: ...
