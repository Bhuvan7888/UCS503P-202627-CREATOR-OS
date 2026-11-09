"""Contract intelligence: rule-based red-flag clause scanning, LLM clause explanations, escalations.

Public API of this feature. Other packages import from here, never from submodules.
"""

from features.contract_intelligence.clause_explanation_service import (
    ClauseExplanationService,
)
from features.contract_intelligence.escalation_rules import open_case, resolve
from features.contract_intelligence.models import (
    ClauseCardOut,
    ClauseInput,
    EscalateRequest,
    EscalationOut,
)
from features.contract_intelligence.red_flag_rules import (
    DEFAULT_FLAG_EXPLANATIONS,
    detect_flags,
)
from features.contract_intelligence.service import ContractIntelligenceService

__all__ = [
    "DEFAULT_FLAG_EXPLANATIONS",
    "ClauseCardOut",
    "ClauseExplanationService",
    "ClauseInput",
    "ContractIntelligenceService",
    "EscalateRequest",
    "EscalationOut",
    "detect_flags",
    "open_case",
    "resolve",
]
