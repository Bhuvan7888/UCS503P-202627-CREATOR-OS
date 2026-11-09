from datetime import UTC, datetime
from uuid import UUID, uuid4

from features.activity_log import ActivityLog, ActivityLogRepo
from features.payments.models import Payment, PaymentCreateRequest
from features.payments.repository import PaymentRepo
from features.payments.rules import (
    create_invoice,
    validate_mark_paid,
    validate_status_change,
)


class PaymentService:
    def __init__(self, payment_repo: PaymentRepo, activity_log_repo: ActivityLogRepo):
        self.payment_repo = payment_repo
        self.activity_log_repo = activity_log_repo

    async def create_payment(
        self,
        request: PaymentCreateRequest,
        brand_id: UUID,
        actor_id: UUID,
        actor_type: str,
        deal_id: UUID,
    ) -> Payment:
        payment = Payment(
            id=uuid4(),
            contract_id=request.contract_id,
            deliverable_id=request.deliverable_id,
            amount_inr=request.amount_inr,
            platform_fee_inr=request.platform_fee_inr,
            status="pending",
            invoice_number=create_invoice(),
            due_date=request.due_date,
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
        )
        created = await self.payment_repo.create(payment)

        log = ActivityLog(
            id=uuid4(),
            brand_id=brand_id,
            deal_id=deal_id,
            actor_type=actor_type,
            actor_label=str(actor_id),
            action="payment_created",
            metadata={"payment_id": str(created.id), "invoice_number": created.invoice_number},
            created_at=datetime.now(UTC),
        )
        await self.activity_log_repo.create(log)

        return created

    async def list_for_brand(
        self, brand_id: UUID, limit: int = 50, offset: int = 0
    ) -> list[Payment]:
        return await self.payment_repo.list_for_brand(brand_id, limit, offset)

    async def list_for_creator(
        self, creator_id: UUID, limit: int = 50, offset: int = 0
    ) -> list[Payment]:
        return await self.payment_repo.list_for_creator(creator_id, limit, offset)

    async def mark_paid(
        self, payment_id: UUID, brand_id: UUID, actor_id: UUID, actor_type: str, deal_id: UUID
    ) -> Payment:
        payment = await self.payment_repo.get(payment_id)
        if not payment:
            raise ValueError("Payment not found")

        validate_mark_paid(payment.status)

        invoice_number = payment.invoice_number
        if not invoice_number:
            invoice_number = create_invoice()

        updated = await self.payment_repo.mark_paid(payment_id, invoice_number)

        log = ActivityLog(
            id=uuid4(),
            brand_id=brand_id,
            deal_id=deal_id,
            actor_type=actor_type,
            actor_label=str(actor_id),
            action="payment_marked_paid",
            metadata={"payment_id": str(payment.id), "invoice_number": invoice_number},
            created_at=datetime.now(UTC),
        )
        await self.activity_log_repo.create(log)

        return updated

    async def update_status(
        self,
        payment_id: UUID,
        status: str,
        brand_id: UUID,
        actor_id: UUID,
        actor_type: str,
        deal_id: UUID,
    ) -> Payment:
        payment = await self.payment_repo.get(payment_id)
        if not payment:
            raise ValueError("Payment not found")

        validate_status_change(payment.status, status)

        updated = await self.payment_repo.update_status(payment_id, status)

        log = ActivityLog(
            id=uuid4(),
            brand_id=brand_id,
            deal_id=deal_id,
            actor_type=actor_type,
            actor_label=str(actor_id),
            action="payment_status_changed",
            metadata={"payment_id": str(payment.id), "status": status},
            created_at=datetime.now(UTC),
        )
        await self.activity_log_repo.create(log)

        return updated
