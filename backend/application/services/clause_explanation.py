import logging
from domain.interfaces.llm import LLMPort
from domain.interfaces.repositories import ClauseCardRepo
from domain.logic.red_flag_engine import detect_flags
from domain.models.contract_intelligence import ClauseCardOut

DEFAULT_FLAG_EXPLANATIONS = {
    "perpetual_usage_rights": "The brand acquires perpetual rights to use your content and likeness forever across all media without additional compensation or expiration date.",
    "unlimited_revisions": "Demanding unlimited revisions exposes the creator to endless rounds of rework and reshoots without compensating for additional time or effort.",
    "unpaid_whitelisting": "Allows the brand to run paid ads and boosting through your creator account handle without paying a whitelisting access fee.",
    "extended_exclusivity": "Exclusivity extends beyond the active campaign window, preventing you from partnering with other brands in the niche.",
}

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
        
        if hasattr(self.clause_card_repo, 'update'):
            return await self.clause_card_repo.update(card)
        return card
