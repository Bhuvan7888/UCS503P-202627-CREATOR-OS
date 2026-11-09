"""Contract status transition rules."""



def is_valid_contract_transition(from_status: str, to_status: str) -> bool:
    """
    Valid transitions:
    - draft <-> uploaded <-> signed
    - any -> void (brand-only, any time)
    - any -> pending_review (forced by an open escalation, Phase 2)
    - void -> draft | uploaded | signed (reverting accidental void)
    - pending_review -> draft | uploaded | signed
    """
    if to_status == "void":
        return True
    if to_status == "pending_review":
        return True

    contract_active_statuses = {"draft", "uploaded", "signed"}
    if from_status in contract_active_statuses and to_status in contract_active_statuses:
        return True

    if from_status in ("void", "pending_review") and to_status in contract_active_statuses:
        return True

    return False
