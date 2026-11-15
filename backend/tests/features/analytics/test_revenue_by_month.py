from datetime import UTC, date, datetime
from decimal import Decimal
from uuid import uuid4

from features.analytics.rules import revenue_by_month
from features.payments import Payment


def _invoice(created: date, status: str, amount: int, due: date | None) -> Payment:
    return Payment(
        id=uuid4(),
        contract_id=uuid4(),
        amount_inr=Decimal(amount),
        status=status,
        invoice_number="INV-1",
        due_date=due,
        created_at=datetime(created.year, created.month, created.day, tzinfo=UTC),
        updated_at=datetime(created.year, created.month, created.day, tzinfo=UTC),
    )


def test_last_six_months_split_into_paid_pending_overdue():
    today = date(2026, 2, 15)
    months = revenue_by_month(
        [
            _invoice(date(2026, 2, 1), "paid", 100, date(2026, 2, 10)),
            _invoice(date(2026, 2, 3), "pending", 50, date(2026, 3, 1)),  # not yet due
            _invoice(
                date(2026, 1, 5), "pending", 30, date(2026, 2, 1)
            ),  # past due, status not updated
            _invoice(
                date(2026, 1, 6), "overdue", 20, None
            ),  # no due date: still counted as pending
            _invoice(date(2025, 6, 1), "paid", 999, None),  # outside the 6-month window
        ],
        today,
    )
    assert [m.month for m in months] == [
        "2025-09",
        "2025-10",
        "2025-11",
        "2025-12",
        "2026-01",
        "2026-02",
    ]
    assert (months[-1].paid, months[-1].pending, months[-1].overdue) == (100, 50, 0)
    assert (months[-2].paid, months[-2].pending, months[-2].overdue) == (0, 20, 30)
    assert all(m.paid == m.pending == m.overdue == 0 for m in months[:4])
