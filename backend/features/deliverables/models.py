from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class Deliverable(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    deal_id: UUID
    contract_id: UUID | None = None
    title: str
    description: str
    status: str
    previous_status: str | None = None
    file_path: str | None = None
    created_at: datetime
    updated_at: datetime

class DeliverableCreateRequest(BaseModel):
    deal_id: UUID
    contract_id: UUID | None = None
    title: str
    description: str

class DeliverableStatusUpdateRequest(BaseModel):
    status: Literal['pending', 'in_production', 'editing', 'submitted', 'approved', 'rejected', 'revision_requested']
    note: str | None = None
