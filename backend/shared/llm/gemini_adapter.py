from __future__ import annotations

import logging

from google import genai
from google.genai import types

from features.contract_intelligence import ClauseInput
from shared.config import settings
from shared.llm.llm_port import LLMPort

logger = logging.getLogger(__name__)


class GeminiAdapter(LLMPort):
    def __init__(self):
        # We assume the API key is passed directly or read from env by the SDK,
        # but the prompt says to read it from config:
        # "Add GEMINI_API_KEY, GEMINI_MODEL_FLASH... to backend/config.py Settings"
        self.client = genai.Client(api_key=settings.GEMINI_API_KEY)
        self.model = settings.GEMINI_MODEL_FLASH

    async def explain_clause(self, clause_text: str, flag_reason: str | None) -> str:
        prompt = (
            "Explain in plain language why the following clause might be a red flag. "
            f"The flagged reason is: {flag_reason}\n\n"
            f"Clause text: {clause_text}"
        )

        # Depending on whether google-genai supports async natively in this version:
        # For this prototype we will use the async client if available or wrap it.
        # google.genai has `aio` for async: `client.aio.models.generate_content`
        response = await self.client.aio.models.generate_content(
            model=self.model,
            contents=prompt,
        )

        return response.text

    async def segment_clauses(self, contract_text: str) -> list[ClauseInput]:
        prompt = (
            "Split the following contract into its individual clauses. For each clause, "
            "give a short clause_type label (e.g. usage_rights, exclusivity, revisions, payment_terms, "
            "termination, confidentiality, other) and the raw_text of that clause verbatim. "
            "Return every clause in the document, in order.\n\n"
            f"Contract text:\n{contract_text}"
        )

        response = await self.client.aio.models.generate_content(
            model=self.model,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=list[ClauseInput],
            ),
        )

        return response.parsed or []
