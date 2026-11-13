from __future__ import annotations

from typing import TYPE_CHECKING, Protocol, runtime_checkable

if TYPE_CHECKING:
    # annotation only: importing it at runtime would create an import cycle with the feature
    from features.contract_intelligence import ClauseInput


@runtime_checkable
class LLMPort(Protocol):
    async def explain_clause(self, clause_text: str, flag_reason: str | None) -> str: ...
    async def segment_clauses(self, contract_text: str) -> list[ClauseInput]: ...
