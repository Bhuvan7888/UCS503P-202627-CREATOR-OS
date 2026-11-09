from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class ActivityLog(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    brand_id: UUID
    deal_id: UUID | None = None
    actor_type: str
    actor_label: str
    action: str
    metadata: dict[str, Any] = {}
    created_at: datetime


class ActivityLogManualEntryRequest(BaseModel):
    action: str
    note: str
    deal_id: UUID | None = None
