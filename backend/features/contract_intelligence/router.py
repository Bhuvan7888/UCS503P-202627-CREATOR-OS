from uuid import UUID

from fastapi import APIRouter, Depends

from features.contract_intelligence.dependencies import (
    get_contract_intelligence_service,
)
from features.contract_intelligence.models import (
    ClauseCardOut,
    EscalateRequest,
    EscalationOut,
    ResolveEscalationRequest,
    ScanContractRequest,
)
from features.contract_intelligence.service import ContractIntelligenceService

# Assuming a get_service dependency exists, or we mock it.
# We'll create a dependency injection helper.

router = APIRouter(prefix="/contracts", tags=["contract_intelligence"])

from interface.dependencies import ActorContext, get_current_brand


@router.get("/{contract_id}/clauses", response_model=list[ClauseCardOut])
async def get_clauses(
    contract_id: UUID,
    service: ContractIntelligenceService = Depends(get_contract_intelligence_service)
):
    return await service.get_clauses(contract_id)

@router.post("/{contract_id}/scan", response_model=list[ClauseCardOut])
async def scan_contract(
    contract_id: UUID,
    req: ScanContractRequest,
    service: ContractIntelligenceService = Depends(get_contract_intelligence_service)
):
    return await service.scan_contract(contract_id, req.clauses)

@router.post("/{contract_id}/escalate", response_model=EscalationOut)
async def escalate_clause(
    contract_id: UUID,
    req: EscalateRequest,
    service: ContractIntelligenceService = Depends(get_contract_intelligence_service)
):
    return await service.escalate_clause(contract_id, req)

# Note: resolving escalation is typically /escalations/{id}/resolve
escalations_router = APIRouter(prefix="/escalations", tags=["escalations"])

@escalations_router.post("/{escalation_id}/resolve", response_model=EscalationOut)
async def resolve_escalation(
    escalation_id: UUID,
    req: ResolveEscalationRequest,
    actor: ActorContext = Depends(get_current_brand),
    service: ContractIntelligenceService = Depends(get_contract_intelligence_service)
):
    return await service.resolve_escalation(escalation_id, req, actor.actor_id)
