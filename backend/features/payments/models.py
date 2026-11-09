from datetime import date, datetime
from decimal import Decimal
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, computed_field


class Payment(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    contract_id: UUID
    deliverable_id: UUID | None = None
    amount_inr: Decimal
    platform_fee_inr: Decimal = Decimal("0")
    status: str
    invoice_number: str
    invoice_pdf_path: str | None = None
    due_date: date | None = None
    paid_at: datetime | None = None
    created_at: datetime
    updated_at: datetime

    @computed_field
    @property
    def net_amount_inr(self) -> Decimal:
        """What the creator actually receives — the brand's invoice shows amount_inr, the creator's shows this."""
        return self.amount_inr - self.platform_fee_inr

class PaymentStatusUpdateRequest(BaseModel):
    status: Literal['pending', 'paid', 'overdue']

class PaymentCreateRequest(BaseModel):
    contract_id: UUID
    deliverable_id: UUID | None = None
    amount_inr: Decimal
    platform_fee_inr: Decimal = Decimal("0")
    due_date: date | None = None
