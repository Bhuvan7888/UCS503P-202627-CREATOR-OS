"""Negotiation: fair-rate range, growth forecast, pre-send checklist, counter-offers, AI chat and scripts.

Public API of this feature. Other packages import from here, never from submodules.
"""

from features.negotiation.models import (
    ChecklistState,
    NegotiationConversation,
    NegotiationOffer,
    NegotiationSession,
    NegotiationSessionCreate,
)
from features.negotiation.repository import NegotiationSessionRepo
from features.negotiation.rules import (
    calculate_base_rate,
    calculate_forecast,
    calculate_range,
    checklist_is_complete,
    generate_script,
)
from features.negotiation.service import NegotiationService

__all__ = [
    "ChecklistState",
    "NegotiationConversation",
    "NegotiationOffer",
    "NegotiationService",
    "NegotiationSession",
    "NegotiationSessionCreate",
    "NegotiationSessionRepo",
    "calculate_base_rate",
    "calculate_forecast",
    "calculate_range",
    "checklist_is_complete",
    "generate_script",
]
