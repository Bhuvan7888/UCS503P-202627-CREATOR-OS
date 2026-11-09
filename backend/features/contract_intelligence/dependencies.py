"""FastAPI dependency providers for contract intelligence (also used by the contracts feature to scan uploads)."""

from features.contract_intelligence.clause_explanation_service import (
    ClauseExplanationService,
)
from features.contract_intelligence.resend_email_adapter import ResendAdapter
from features.contract_intelligence.service import ContractIntelligenceService
from features.contract_intelligence.supabase_repository import (
    SupabaseClauseCardRepo,
    SupabaseEscalationRepo,
)
from features.contracts.supabase_repository import SupabaseContractRepo
from shared.llm.gemini_adapter import GeminiAdapter
from shared.supabase_client import get_supabase_client


def get_contract_intelligence_service() -> ContractIntelligenceService:
    client = get_supabase_client(service_role=True)
    clause_card_repo = SupabaseClauseCardRepo(client)
    escalation_repo = SupabaseEscalationRepo(client)
    contract_repo = SupabaseContractRepo(client)
    
    email_port = ResendAdapter()
    llm_port = GeminiAdapter()
    clause_explanation_service = ClauseExplanationService(llm_port, clause_card_repo)
    
    return ContractIntelligenceService(
        clause_card_repo=clause_card_repo,
        escalation_repo=escalation_repo,
        contract_repo=contract_repo,
        email_port=email_port,
        clause_explanation_service=clause_explanation_service
    )
