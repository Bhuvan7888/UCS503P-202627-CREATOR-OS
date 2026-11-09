"""Deliverable status transition rules."""


def is_valid_deliverable_transition(from_status: str, to_status: str) -> bool:
    """
    Valid transitions:
    Supports full bidirectional transitions and reversions between all deliverable statuses:
    pending, in_production, editing, submitted, approved, revision_requested, rejected.
    This ensures neither creator nor brand is ever trapped if a status was selected by mistake.
    """
    deliverable_statuses = {
        "pending",
        "in_production",
        "editing",
        "submitted",
        "approved",
        "revision_requested",
        "rejected",
    }
    return from_status in deliverable_statuses and to_status in deliverable_statuses
