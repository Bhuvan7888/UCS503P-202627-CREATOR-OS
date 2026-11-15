from __future__ import annotations

import asyncio
import json
import logging
import re
from typing import Any, get_origin

import httpx
from pydantic import TypeAdapter

from features.contract_intelligence import ClauseInput
from shared.config import settings
from shared.llm.llm_port import LLMPort

logger = logging.getLogger(__name__)

_URL = "https://api.groq.com/openai/v1/chat/completions"
_TIMEOUT_SECONDS = 60
_TRANSIENT = {429, 500, 502, 503, 504}
_THINK = re.compile(r"<think>.*?</think>", re.DOTALL)


class GroqAdapter(LLMPort):
    """Groq (OpenAI-compatible chat completions). Used instead of Gemini while GROQ_API_KEY is set."""

    def __init__(self):
        self.model = settings.GROQ_MODEL
        self.headers = {"Authorization": f"Bearer {settings.GROQ_API_KEY.strip()}"}

    async def _chat(self, prompt: str, as_json: bool = False) -> str:
        body: dict[str, Any] = {
            "model": self.model,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.6,
            # Qwen 3 thinks out loud by default; keep only the answer
            "reasoning_format": "hidden",
        }
        if as_json:
            body["response_format"] = {"type": "json_object"}
        async with httpx.AsyncClient(timeout=_TIMEOUT_SECONDS) as client:
            for attempt in range(2):
                r = await client.post(_URL, headers=self.headers, json=body)
                if r.status_code in _TRANSIENT and attempt == 0:
                    logger.warning("Groq %s, retrying once", r.status_code)
                    await asyncio.sleep(1)
                    continue
                if r.status_code >= 400:
                    raise RuntimeError(f"Groq call failed ({r.status_code}): {r.text[:200]}")
                text = r.json()["choices"][0]["message"]["content"] or ""
                return _THINK.sub("", text).strip()
        raise RuntimeError("Groq call failed")

    async def write(self, prompt: str) -> str:
        return await self._chat(prompt)

    async def write_structured(self, prompt: str, schema: Any) -> Any:
        # JSON mode needs a top-level object, so a list is wrapped as {"items": [...]}
        is_list = get_origin(schema) is list
        shape = TypeAdapter(schema).json_schema()
        wanted = {"type": "object", "properties": {"items": shape}} if is_list else shape
        text = await self._chat(
            f"{prompt}\n\nRespond with JSON only, matching this JSON Schema:\n{json.dumps(wanted)}",
            as_json=True,
        )
        data = json.loads(text)
        return TypeAdapter(schema).validate_python(data["items"] if is_list else data)

    async def explain_clause(self, clause_text: str, flag_reason: str | None) -> str:
        return await self.write(
            "Explain in plain language why the following clause might be a red flag. "
            f"The flagged reason is: {flag_reason}\n\nClause text: {clause_text}"
        )

    async def segment_clauses(self, contract_text: str) -> list[ClauseInput]:
        return await self.write_structured(
            "Split the following contract into its individual clauses. For each clause, "
            "give a short clause_type label (e.g. usage_rights, exclusivity, revisions, payment_terms, "
            "termination, confidentiality, other) and the raw_text of that clause verbatim. "
            "Return every clause in the document, in order.\n\n"
            f"Contract text:\n{contract_text}",
            list[ClauseInput],
        )
