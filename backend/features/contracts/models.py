from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class Contract(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    deal_id: UUID | None = None
    creator_id: UUID | None = None
    file_path: str | None = None
    status: str
    creator_status: str = "unread"
    usage_rights_duration_days: int | None = None
    exclusivity_scope: str | None = None
    revision_limit: int | None = None
    payment_timeline_days: int | None = None
    previous_status: str | None = None
    raw_text: str | None = None
    created_at: datetime
    updated_at: datetime

class ContractStatusUpdateRequest(BaseModel):
    status: Literal['draft', 'uploaded', 'signed', 'pending_review', 'void']

class ContractCreatorStatusUpdateRequest(BaseModel):
    creator_status: Literal['unread', 'read', 'ongoing', 'completed']
