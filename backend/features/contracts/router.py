import logging
import re
from uuid import UUID

from fastapi import APIRouter, Depends, File, Response, UploadFile

from features.activity_log.supabase_repository import SupabaseActivityLogRepo
from features.auth.dependencies import (
    ActorContext,
    get_current_actor,
    get_current_brand,
)
from features.contract_intelligence import ClauseInput, ContractIntelligenceService
from features.contract_intelligence.dependencies import (
    get_contract_intelligence_service,
)
from features.contracts.contract_pdf import extract_text, generate_sample_contract_pdf
from features.contracts.contract_storage_adapter import SupabaseStorage
from features.contracts.dependencies import load_accessible_contract
from features.contracts.models import (
    Contract,
    ContractStatusUpdateRequest,
)
from features.contracts.service import ContractService
from features.contracts.supabase_repository import SupabaseContractRepo
from features.deals.dependencies import load_accessible_deal
from shared.errors import InvalidStatusTransition
from shared.http_errors import map_errors
from shared.llm.gemini_adapter import GeminiAdapter
from shared.pagination import clamp_page_size
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
        if any(
            k in lower
            for k in ["usage right", "licens", "perpetu", "intellectual property", "ownership"]
        ):
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


@router.post("/deals/{deal_id}/contracts", response_model=Contract)
async def upload_contract(
    deal_id: UUID,
    file: UploadFile = File(...),
    actor: ActorContext = Depends(get_current_brand),
    storage: SupabaseStorage = Depends(get_storage),
    service: ContractService = Depends(get_contract_service),
    ci_service: ContractIntelligenceService = Depends(get_contract_intelligence_service),
):
    await load_accessible_deal(deal_id, actor)
    content = await file.read()
    path = f"contracts/{deal_id}/{file.filename}"
    uploaded_path = await storage.upload_file("creator-os-assets", path, content)
    contract = await service.create_contract(
        deal_id, uploaded_path, actor.brand_id, actor.actor_id, actor.actor_type
    )

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
                logger.warning(
                    "Gemini clause segmentation unavailable; using fallback segmentation"
                )
            if not clauses:
                clauses = fallback_segment_clauses(text)
            if clauses:
                await ci_service.scan_contract(contract.id, clauses)
    except Exception:
        logger.exception("Automatic contract scan failed for contract %s", contract.id)

    return contract


@router.get("/contracts/{id}", response_model=Contract)
async def get_contract(
    id: UUID,
    actor: ActorContext = Depends(get_current_actor),
):
    return await load_accessible_contract(id, actor)


@router.get("/contracts", response_model=list[Contract])
async def list_contracts(
    limit: int = 50,
    offset: int = 0,
    actor: ActorContext = Depends(get_current_actor),
    service: ContractService = Depends(get_contract_service),
):
    limit = clamp_page_size(limit)
    if actor.actor_type == "creator":
        return await service.list_for_creator(actor.creator_id, limit, offset)
    return await service.list_for_brand(actor.brand_id, limit, offset)


@router.patch("/contracts/{id}/status", response_model=Contract)
async def update_contract_status(
    id: UUID,
    request: ContractStatusUpdateRequest,
    actor: ActorContext = Depends(get_current_brand),
    service: ContractService = Depends(get_contract_service),
):
    await load_accessible_contract(id, actor)
    with map_errors({InvalidStatusTransition: 400, ValueError: 404}):
        return await service.update_status(
            id, request, actor.actor_id, actor.actor_type, actor.brand_id
        )
