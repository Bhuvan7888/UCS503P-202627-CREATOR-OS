from __future__ import annotations

import asyncio
import logging
from typing import Any

from google import genai
from google.genai import errors, types

from features.contract_intelligence import ClauseInput
from shared.config import settings
from shared.llm.llm_port import LLMPort

logger = logging.getLogger(__name__)

_BACKOFF_SECONDS = 1.0
_TIMEOUT_MS = 15_000


class GeminiAdapter(LLMPort):
    def __init__(self):
        # Each call is capped so a slow provider can't hold a request open (milliseconds).
        self.client = genai.Client(
            api_key=settings.GEMINI_API_KEY, http_options=types.HttpOptions(timeout=_TIMEOUT_MS)
        )
        self.model = settings.GEMINI_MODEL_FLASH
        self.fallback_model = settings.GEMINI_MODEL_FALLBACK

    async def explain_clause(self, clause_text: str, flag_reason: str | None) -> str:
        prompt = (
            "Explain in plain language why the following clause might be a red flag. "
            f"The flagged reason is: {flag_reason}\n\n"
            f"Clause text: {clause_text}"
        )
        response = await self._generate(prompt)
        return response.text or ""

    async def segment_clauses(self, contract_text: str) -> list[ClauseInput]:
        prompt = (
            "Split the following contract into its individual clauses. For each clause, "
            "give a short clause_type label (e.g. usage_rights, exclusivity, revisions, payment_terms, "
            "termination, confidentiality, other) and the raw_text of that clause verbatim. "
            "Return every clause in the document, in order.\n\n"
            f"Contract text:\n{contract_text}"
        )

        response = await self._generate(
            prompt,
            types.GenerateContentConfig(
                response_mime_type="application/json", response_schema=list[ClauseInput]
            ),
        )
        return response.parsed or []

    async def _generate(
        self, prompt: str, config: types.GenerateContentConfig | None = None
    ) -> Any:
        """generate_content on the configured model; if it fails for any reason (overloaded, rate
        limited, timed out, model name retired) try the lighter model, which usually still answers."""
        attempts = [self.model, self.fallback_model, self.fallback_model]
        last: Exception | None = None
        for n, model in enumerate(attempts):
            if n == len(attempts) - 1:
                await asyncio.sleep(_BACKOFF_SECONDS)
            try:
                return await self.client.aio.models.generate_content(
                    model=model, contents=prompt, config=config
                )
            except Exception as e:  # noqa: BLE001 — any failure should try the fallback model
                code = e.code if isinstance(e, errors.APIError) else type(e).__name__
                logger.warning("Gemini call on %s failed (%s): %s", model, code, str(e)[:200])
                last = e
        assert last is not None
        raise last

    async def write(self, prompt: str) -> str:
        response = await self._generate(prompt)
        return response.text or ""

    async def write_structured(self, prompt: str, schema: Any) -> Any:
        response = await self._generate(
            prompt,
            types.GenerateContentConfig(
                response_mime_type="application/json", response_schema=schema
            ),
        )
        if response.parsed is None:
            raise ValueError("The AI returned no structured result")
        return response.parsed
