import uuid
from datetime import datetime

from shared.errors import InvalidStatusTransition


def validate_mark_paid(current_status: str) -> None:
    if current_status == "paid":
        raise InvalidStatusTransition("Payment", current_status, "paid")
    if current_status != "pending":
        raise InvalidStatusTransition("Payment", current_status, "paid")


def validate_status_change(current_status: str, new_status: str) -> None:
    if new_status not in ("pending", "paid", "overdue"):
        raise InvalidStatusTransition("Payment", current_status, new_status)


def create_invoice() -> str:
    return f"INV-{datetime.now().year}-{uuid.uuid4().hex[:4].upper()}"
