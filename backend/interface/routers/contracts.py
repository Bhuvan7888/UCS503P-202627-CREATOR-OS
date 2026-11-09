import logging
import re
from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, Response, UploadFile

from application.services.contract_intelligence import ContractIntelligenceService
from application.services.contracts import ContractService
from domain.models.contract import (
    Contract,
    ContractCreatorStatusUpdateRequest,
    ContractStatusUpdateRequest,
)
from domain.models.contract_intelligence import ClauseInput
from features.activity_log.supabase_repository import SupabaseActivityLogRepo
from features.deals.supabase_repository import SupabaseDealRepo
from infrastructure.pdf import extract_text, generate_sample_contract_pdf
from infrastructure.supabase.repos import SupabaseContractRepo
from infrastructure.supabase.storage import SupabaseStorage
from interface.dependencies import ActorContext, get_current_actor, get_current_brand
from interface.routers.contract_intelligence import get_ci_service
from shared.errors import InvalidStatusTransition, PermissionDeniedError
from shared.llm.gemini_adapter import GeminiAdapter
from shared.supabase_client import get_supabase_client

logger = logging.getLogger(__name__)

router = APIRouter(tags=["contracts"])


def fallback_segment_clauses(text: str) -> list[ClauseInput]:
    """Fallback segmenter that splits contract text by numbered sections or clauses
    and infers clause types when Gemini API is unavailable or in mock mode."""
    pattern = r"(?=(?:^|\n)(?:\d+[\.\)]\s+|Section\s+\d+|Clause\s+\d+|ARTICLE\s+\d+))"
    raw_parts = [p.strip() for p in re.split(pattern, text, flags=re.MULTILINE) if p.strip()]
    if len(raw_parts) <= 1:
        raw_parts = [p.strip() for p in text.split("\n\n") if p.strip()]

    def classify_clause(clause_text: str) -> str:
        lower = clause_text.lower()
        if any(k in lower for k in ["usage right", "licens", "perpetu", "intellectual property", "ownership"]):
            return "usage_rights"
        if any(k in lower for k in ["revision", "edit", "reshoot"]):
            return "revisions"
        if any(k in lower for k in ["exclusiv", "non-compete", "competitor"]):
            return "exclusivity"
        if any(k in lower for k in ["payment", "compensation", "fee", "invoice", "inr"]):
            return "payment_terms"
        if any(k in lower for k in ["deliverable", "scope", "reel", "story", "video", "post"]):
            return "deliverables"
        if any(k in lower for k in ["whitelist", "boost", "ad authorization"]):
            return "whitelisting"
        return "general_terms"

    clauses: list[ClauseInput] = []
    for part in raw_parts:
        if len(part) < 15 and not any(c.isalnum() for c in part):
            continue
        clauses.append(ClauseInput(clause_type=classify_clause(part), raw_text=part))
    return clauses

def get_contract_service() -> ContractService:
    client = get_supabase_client(service_role=True)
    return ContractService(
        contract_repo=SupabaseContractRepo(client),
        activity_log_repo=SupabaseActivityLogRepo(client),
    )

def get_storage() -> SupabaseStorage:
    return SupabaseStorage(get_supabase_client(service_role=True))

@router.get("/contracts/sample-contract-pdf")
async def download_sample_contract_pdf():
    pdf_bytes = generate_sample_contract_pdf()
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": 'attachment; filename="creator_os_sample_contract.pdf"'},
    )

@router.post("/contracts/upload-sample", response_model=Contract)
async def upload_sample_contract(
    actor: ActorContext = Depends(get_current_actor),
    storage: SupabaseStorage = Depends(get_storage),
    service: ContractService = Depends(get_contract_service),
    ci_service: ContractIntelligenceService = Depends(get_ci_service),
):
    pdf_bytes = generate_sample_contract_pdf()
    text = extract_text(pdf_bytes)

    if actor.actor_type == "creator":
        path = f"personal-contracts/{actor.creator_id}/sample-contract.pdf"
        uploaded_path = await storage.upload_file("creator-os-assets", path, pdf_bytes)
        contract = await service.create_personal_contract(actor.creator_id, uploaded_path)
    else:
        client = get_supabase_client(service_role=True)
        deal_repo = SupabaseDealRepo(client)
        deals = await deal_repo.list_for_brand(actor.brand_id, limit=1)
        deal_id = deals[0].id if deals else UUID(int=1)
        path = f"contracts/{deal_id}/sample-contract.pdf"
        uploaded_path = await storage.upload_file("creator-os-assets", path, pdf_bytes)
        contract = await service.create_contract(deal_id, uploaded_path, actor.brand_id, actor.actor_id, actor.actor_type)

    if text.strip():
        contract = await service.save_raw_text(contract.id, text)
        clauses = fallback_segment_clauses(text)
        if clauses:
            await ci_service.scan_contract(contract.id, clauses)

    return contract

@router.post("/deals/{deal_id}/contracts", response_model=Contract)
async def upload_contract(
    deal_id: UUID,
    file: UploadFile = File(...),
    actor: ActorContext = Depends(get_current_brand),
    storage: SupabaseStorage = Depends(get_storage),
    service: ContractService = Depends(get_contract_service),
    ci_service: ContractIntelligenceService = Depends(get_ci_service),
):
    content = await file.read()
    path = f"contracts/{deal_id}/{file.filename}"
    uploaded_path = await storage.upload_file("creator-os-assets", path, content)
    contract = await service.create_contract(deal_id, uploaded_path, actor.brand_id, actor.actor_id, actor.actor_type)

    # Automatic contract scan: best-effort. A PDF with no extractable text
    # (scanned image) or an LLM/segmentation failure must never fail the upload —
    # the contract still exists, it's just unscanned until someone retries.
    try:
        text = extract_text(content)
        if text.strip():
            # Saved unconditionally (before segmentation) so the full text is
            # always viewable even if clause segmentation/scanning fails below.
            contract = await service.save_raw_text(contract.id, text)
            clauses = []
            try:
                clauses = await GeminiAdapter().segment_clauses(text)
            except Exception:
                logger.warning("Gemini clause segmentation unavailable; using fallback segmentation")
            if not clauses:
                clauses = fallback_segment_clauses(text)
            if clauses:
                await ci_service.scan_contract(contract.id, clauses)
    except Exception:
        logger.exception("Automatic contract scan failed for contract %s", contract.id)

    return contract

@router.post("/creators/me/contracts", response_model=Contract)
async def upload_personal_contract(
    file: UploadFile = File(...),
    actor: ActorContext = Depends(get_current_actor),
    storage: SupabaseStorage = Depends(get_storage),
    service: ContractService = Depends(get_contract_service),
    ci_service: ContractIntelligenceService = Depends(get_ci_service),
):
    if not actor.creator_id:
        raise HTTPException(status_code=403, detail="This action requires a creator account")
    content = await file.read()
    path = f"personal-contracts/{actor.creator_id}/{file.filename}"
    uploaded_path = await storage.upload_file("creator-os-assets", path, content)
    contract = await service.create_personal_contract(actor.creator_id, uploaded_path)

    # Same best-effort scan as a deal contract upload: never fail the upload
    # over an unscannable PDF or a segmentation/LLM hiccup.
    try:
        text = extract_text(content)
        if text.strip():
            contract = await service.save_raw_text(contract.id, text)
            clauses = []
            try:
                clauses = await GeminiAdapter().segment_clauses(text)
            except Exception:
                logger.warning("Gemini clause segmentation unavailable; using fallback segmentation")
            if not clauses:
                clauses = fallback_segment_clauses(text)
            if clauses:
                await ci_service.scan_contract(contract.id, clauses)
    except Exception:
        logger.exception("Automatic contract scan failed for personal contract %s", contract.id)

    return contract

@router.get("/contracts/{id}", response_model=Contract)
async def get_contract(
    id: UUID,
    actor: ActorContext = Depends(get_current_actor),
    service: ContractService = Depends(get_contract_service)
):
    contract = await service.get(id)
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    return contract

@router.get("/contracts", response_model=list[Contract])
async def list_contracts(
    limit: int = 50,
    offset: int = 0,
    actor: ActorContext = Depends(get_current_actor),
    service: ContractService = Depends(get_contract_service)
):
    limit = min(limit, 100)
    if actor.actor_type == "creator":
        return await service.list_for_creator(actor.creator_id, limit, offset)
    return await service.list_for_brand(actor.brand_id, limit, offset)

@router.patch("/contracts/{id}/creator-status", response_model=Contract)
async def update_contract_creator_status(
    id: UUID,
    request: ContractCreatorStatusUpdateRequest,
    actor: ActorContext = Depends(get_current_actor),
    service: ContractService = Depends(get_contract_service)
):
    if not actor.creator_id:
        raise HTTPException(status_code=403, detail="This action requires a creator account")
    try:
        return await service.update_creator_status(id, request.creator_status, actor.creator_id)
    except PermissionDeniedError as e:
        raise HTTPException(status_code=403, detail=str(e))

@router.patch("/contracts/{id}/status", response_model=Contract)
async def update_contract_status(
    id: UUID,
    request: ContractStatusUpdateRequest,
    actor: ActorContext = Depends(get_current_brand),
    service: ContractService = Depends(get_contract_service)
):
    try:
        return await service.update_status(id, request, actor.actor_id, actor.actor_type, actor.brand_id)
    except InvalidStatusTransition as e:
        raise HTTPException(status_code=400, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
