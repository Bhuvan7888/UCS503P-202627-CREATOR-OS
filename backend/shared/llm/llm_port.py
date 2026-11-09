from typing import Protocol, runtime_checkable

from domain.models.contract_intelligence import ClauseInput
from domain.models.negotiation import NegotiationSession


@runtime_checkable
class LLMPort(Protocol):
    async def explain_clause(self, clause_text: str, flag_reason: str | None) -> str: ...
    async def draft_script(self, session: NegotiationSession, kind: str) -> str: ...
    async def suggest_negotiation_move(
        self, session: NegotiationSession, brand_name: str, conversation_text: str,
        history: list[tuple[str, str]],
    ) -> str: ...
    async def segment_clauses(self, contract_text: str) -> list[ClauseInput]: ...
