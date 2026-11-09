from typing import Literal

from shared.errors import InvalidStatusTransition


def open_case(contract_status: str) -> str:
    """
    Opens an escalation case. The contract status must be updated to 'pending_review'.
    """
    if contract_status == "void":
        raise InvalidStatusTransition("Contract", "void", "pending_review")
        
    return "pending_review"


def resolve(decision: Literal['cleared', 'amended', 'rejected'], previous_status: str) -> str:
    """
    Resolves an escalation case based on the decision.
    - 'cleared' restores the previous status.
    - 'rejected' voids the contract.
    - 'amended' can either restore the previous status or keep it in pending_review 
      (assuming it restores the previous status and relies on other processes to update clauses).
    """
    if decision == "rejected":
        return "void"
    if decision in ("cleared", "amended"):
        if not previous_status:
            return "draft"  # Fallback if no previous status exists
        return previous_status
        
    raise InvalidStatusTransition("Escalation", decision, "resolved")
