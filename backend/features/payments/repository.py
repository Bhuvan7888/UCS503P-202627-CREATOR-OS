"""Repository port (Protocol) for payments."""

from __future__ import annotations

from typing import Protocol, runtime_checkable
from uuid import UUID

from features.payments.models import Payment


@runtime_checkable
class PaymentRepo(Protocol):
    async def create(self, payment: Payment) -> Payment: ...
    async def get(self, id: UUID) -> Payment | None: ...
    async def list_for_brand(
        self, brand_id: UUID, limit: int = 50, offset: int = 0
    ) -> list[Payment]: ...
    async def list_for_creator(
        self, creator_id: UUID, limit: int = 50, offset: int = 0
    ) -> list[Payment]: ...
    async def mark_paid(self, id: UUID, invoice_number: str | None = None) -> Payment: ...
    async def update_status(self, id: UUID, status: str) -> Payment: ...
