from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field

RequestStatus = Literal["pending", "approved", "rejected"]


class PublishRequest(BaseModel):
    id: UUID
    workspace_id: UUID
    content_item_id: UUID
    requested_by: UUID | None = None
    source: Literal["human", "agent"] = "human"
    agent_name: str | None = None
    note: str | None = None
    status: RequestStatus = "pending"
    reason: str | None = None
    decided_by: UUID | None = None
    decided_at: datetime | None = None
    created_at: datetime


class PublishRequestCreate(BaseModel):
    content_item_id: UUID
    note: str | None = Field(default=None, max_length=1000)


class RejectRequest(BaseModel):
    reason: str = Field(min_length=1, max_length=1000)
