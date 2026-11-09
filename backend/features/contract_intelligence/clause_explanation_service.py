import logging

from features.contract_intelligence.models import ClauseCardOut
from features.contract_intelligence.red_flag_rules import (
    DEFAULT_FLAG_EXPLANATIONS,
    detect_flags,
)
from features.contract_intelligence.repository import ClauseCardRepo
from shared.llm.llm_port import LLMPort

logger = logging.getLogger(__name__)


class ClauseExplanationService:
    def __init__(self, llm: LLMPort, clause_card_repo: ClauseCardRepo):
        self.llm = llm
        self.clause_card_repo = clause_card_repo

    async def generate_explanation_for_card(self, card: ClauseCardOut) -> ClauseCardOut:
        """
        Orchestrates red_flag_engine and LLMPort to attach llm_explanation to a ClauseCardRepo row.
        """
        flags = detect_flags(card.raw_text, card.clause_type)

        flag_status = "green"
        flag_reason = None
        if flags:
            flag_status = "red"
            flag_reason = flags[0].reason_code

        llm_explanation = None
        if flag_status == "red":
            try:
                llm_explanation = await self.llm.explain_clause(card.raw_text, flag_reason)
            except Exception as e:
                logger.error(f"Failed to fetch LLM explanation for clause flag: {e}")
                llm_explanation = None
            if not llm_explanation and flag_reason:
                llm_explanation = DEFAULT_FLAG_EXPLANATIONS.get(flag_reason)

        card.flag = flag_status
        card.flag_reason_code = flag_reason
        card.llm_explanation = llm_explanation

        if hasattr(self.clause_card_repo, "update"):
            return await self.clause_card_repo.update(card)
        return card
