"""Which LLM the app talks to: Groq while GROQ_API_KEY is set (temporary, 2026-11-15), otherwise Gemini."""

from shared.config import settings
from shared.llm.gemini_adapter import GeminiAdapter
from shared.llm.groq_adapter import GroqAdapter
from shared.llm.llm_port import LLMPort


def make_llm() -> LLMPort:
    return GroqAdapter() if settings.GROQ_API_KEY.strip() else GeminiAdapter()
