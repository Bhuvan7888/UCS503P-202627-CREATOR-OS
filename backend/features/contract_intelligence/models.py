from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class ClauseCardOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    contract_id: UUID
    clause_type: str
    raw_text: str
    flag: Literal['red', 'yellow', 'green']
    flag_reason_code: str | None = None
    llm_explanation: str | None = None
    created_at: datetime


class EscalationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    contract_id: UUID
    clause_card_id: UUID
    status: Literal['open', 'cleared', 'amended', 'rejected']
    opened_at: datetime
    resolved_at: datetime | None = None
    resolved_by: UUID | None = None
    resolution_note: str | None = None


class ClauseInput(BaseModel):
    clause_type: str
    raw_text: str


class ScanContractRequest(BaseModel):
    clauses: list[ClauseInput]


class EscalateRequest(BaseModel):
    clause_card_id: UUID
    reason_code: str


class ResolveEscalationRequest(BaseModel):
    decision: Literal['cleared', 'amended', 'rejected']
    note: str

# Internal domain models

class FlagResult(BaseModel):
    flag: Literal['red', 'yellow', 'green']
    reason_code: str | None = None
