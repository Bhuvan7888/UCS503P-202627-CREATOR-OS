"""Supabase implementation of the payments repository."""

from datetime import UTC, datetime
from uuid import UUID

from supabase import Client

from features.demo_mode import DemoFallbackMixin
from features.payments.models import Payment
from shared.supabase_query import first_or_none, run_query


class SupabasePaymentRepo(DemoFallbackMixin):
    _fallback_repo_name = "payment_repo"
    def __init__(self, client: Client):
        self.client = client
    async def create(self, payment: Payment) -> Payment:
        res = await run_query(self.client.table("payments").insert(
            payment.model_dump(mode="json", exclude={"id", "net_amount_inr"})
        ))
        return Payment.model_validate(res.data[0])
    async def get(self, id: UUID) -> Payment | None:
        res = await run_query(self.client.table("payments").select("*").eq("id", str(id)))
        return first_or_none(Payment, res)
    async def list_for_brand(self, brand_id: UUID, limit: int = 50, offset: int = 0) -> list[Payment]:
        res = (
            await run_query(self.client.table("payments").select("*, contracts!inner(deals!inner(brand_id))")
            .eq("contracts.deals.brand_id", str(brand_id))
            .order("created_at", desc=True).range(offset, offset + limit - 1))
        )
        return [Payment.model_validate({k: v for k, v in d.items() if k != 'contracts'}) for d in res.data]
    async def list_for_creator(self, creator_id: UUID, limit: int = 50, offset: int = 0) -> list[Payment]:
        res = (
            await run_query(self.client.table("payments").select("*, contracts!inner(deals!inner(creator_id))")
            .eq("contracts.deals.creator_id", str(creator_id))
            .order("created_at", desc=True).range(offset, offset + limit - 1))
        )
        return [Payment.model_validate({k: v for k, v in d.items() if k != 'contracts'}) for d in res.data]
    async def mark_paid(self, id: UUID, invoice_number: str | None = None) -> Payment:
        update_data = {"status": "paid", "paid_at": datetime.now(UTC).isoformat()}
        if invoice_number:
            update_data["invoice_number"] = invoice_number
        res = await run_query(self.client.table("payments").update(update_data).eq("id", str(id)))
        return Payment.model_validate(res.data[0])
    async def update_status(self, id: UUID, status: str) -> Payment:
        update_data = {"status": status, "paid_at": datetime.now(UTC).isoformat() if status == "paid" else None}
        res = await run_query(self.client.table("payments").update(update_data).eq("id", str(id)))
        return Payment.model_validate(res.data[0])
