import re

from domain.models.contract_intelligence import FlagResult

# Fixed list of red flags
RED_FLAG_PATTERNS = [
    (r"\b(perpetual( usage)? rights?|in perpetuity)\b", "perpetual_usage_rights"),
    (r"\b(unpaid whitelisting|unpaid boosting|whitelisting/boosting)\b", "unpaid_whitelisting"),
    (r"\bunlimited revisions?\b", "unlimited_revisions"),
    (r"\b(exclusivity beyond|perpetual exclusivity)\b", "extended_exclusivity"),
]

def detect_flags(clause_text: str, clause_type: str) -> list[FlagResult]:
    """
    Scans the given clause text for fixed red-flag patterns.
    Returns a list of FlagResult for any matching patterns.
    """
    results = []
    lower_text = clause_text.lower()
    
    for pattern, reason_code in RED_FLAG_PATTERNS:
        # Simple regex matching for now. The requirement is strict rule-based matching.
        # Replacing non-word characters in case we want flexibility, but strict regex matching fits the bill.
        # "whitelisting/boosting" contains a slash, so \b might behave differently depending on engine.
        if re.search(pattern, lower_text):
            results.append(FlagResult(flag="red", reason_code=reason_code))
            
    return results
