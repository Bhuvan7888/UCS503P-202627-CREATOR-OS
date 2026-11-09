from uuid import UUID

from fastapi import APIRouter, Depends

from application.services.contract_intelligence import ContractIntelligenceService
from domain.models.contract_intelligence import (
    ClauseCardOut,
    EscalateRequest,
    EscalationOut,
    ResolveEscalationRequest,
    ScanContractRequest,
)

# Assuming a get_service dependency exists, or we mock it.
# We'll create a dependency injection helper.

router = APIRouter(prefix="/contracts", tags=["contract_intelligence"])

from application.services.clause_explanation import ClauseExplanationService
from infrastructure.email.resend_adapter import ResendAdapter
from infrastructure.supabase.contract_intelligence_repos import (
    SupabaseClauseCardRepo,
    SupabaseEscalationRepo,
)
from infrastructure.supabase.repos import SupabaseContractRepo
from interface.dependencies import ActorContext, get_current_brand
from shared.llm.gemini_adapter import GeminiAdapter
from shared.supabase_client import get_supabase_client


def get_ci_service() -> ContractIntelligenceService:
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

@router.get("/{contract_id}/clauses", response_model=list[ClauseCardOut])
async def get_clauses(
    contract_id: UUID,
    service: ContractIntelligenceService = Depends(get_ci_service)
):
    return await service.get_clauses(contract_id)

@router.post("/{contract_id}/scan", response_model=list[ClauseCardOut])
async def scan_contract(
    contract_id: UUID,
    req: ScanContractRequest,
    service: ContractIntelligenceService = Depends(get_ci_service)
):
    return await service.scan_contract(contract_id, req.clauses)

@router.post("/{contract_id}/escalate", response_model=EscalationOut)
async def escalate_clause(
    contract_id: UUID,
    req: EscalateRequest,
    service: ContractIntelligenceService = Depends(get_ci_service)
):
    return await service.escalate_clause(contract_id, req)

# Note: resolving escalation is typically /escalations/{id}/resolve
escalations_router = APIRouter(prefix="/escalations", tags=["escalations"])

@escalations_router.post("/{escalation_id}/resolve", response_model=EscalationOut)
async def resolve_escalation(
    escalation_id: UUID,
    req: ResolveEscalationRequest,
    actor: ActorContext = Depends(get_current_brand),
    service: ContractIntelligenceService = Depends(get_ci_service)
):
    return await service.resolve_escalation(escalation_id, req, actor.actor_id)
