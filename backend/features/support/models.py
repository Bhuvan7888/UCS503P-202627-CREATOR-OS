from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field

TicketCategory = Literal["general", "technical", "feature_request", "bug_report"]
TicketPriority = Literal["low", "medium", "high", "urgent"]
TicketStatus = Literal["open", "in_progress", "resolved", "closed"]


class TicketCreate(BaseModel):
    subject: str = Field(min_length=1, max_length=200)
    category: TicketCategory = "general"
    priority: TicketPriority = "medium"
    description: str = Field(min_length=1, max_length=5000)


class Ticket(TicketCreate):
    id: UUID
    workspace_id: UUID
    user_id: UUID
    status: TicketStatus = "open"
    created_at: datetime
    updated_at: datetime
