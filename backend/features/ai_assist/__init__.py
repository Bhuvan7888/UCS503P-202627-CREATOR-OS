"""AI assistance for a workspace: AI knowledge, Generate Title/Description/Hook/Outline, content suggestions.

Public API of this feature. Other packages import from here, never from submodules.
"""

from features.ai_assist.models import AiKnowledge, SuggestionSet
from features.ai_assist.service import AiAssistService

__all__ = ["AiAssistService", "AiKnowledge", "SuggestionSet"]
