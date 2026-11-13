from __future__ import annotations

from typing import TYPE_CHECKING, Any, Protocol, runtime_checkable

if TYPE_CHECKING:
    # annotation only: importing it at runtime would create an import cycle with the feature
    from features.contract_intelligence import ClauseInput


@runtime_checkable
class LLMPort(Protocol):
    async def explain_clause(self, clause_text: str, flag_reason: str | None) -> str: ...
    async def segment_clauses(self, contract_text: str) -> list[ClauseInput]: ...
    async def write(self, prompt: str) -> str: ...
    async def write_structured(self, prompt: str, schema: Any) -> Any:
        """Generate JSON matching `schema` (a Pydantic model or list[...] of one) and parse it."""
        ...
