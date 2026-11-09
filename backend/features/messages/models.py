from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class Message(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    brand_id: UUID
    creator_id: UUID
    sender_type: Literal["brand", "creator"]
    body: str
    created_at: datetime
    read_at: datetime | None = None


class MessageCreateRequest(BaseModel):
    body: str
