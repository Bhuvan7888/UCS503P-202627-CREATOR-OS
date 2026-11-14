from datetime import datetime
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, Field

Scope = Literal[
    "content:read",
    "content:write",
    "publish:write",
    "channels:read",
    "analytics:read",
    "webhooks:write",
    "owner",
]
WebhookEvent = Literal[
    "publish.pending_approval", "publish.approved", "publish.rejected", "content.stage_changed"
]


class ApiKey(BaseModel):
    id: UUID
    workspace_id: UUID
    name: str
    prefix: str
    scopes: list[Scope]
    created_by: UUID | None = None
    created_at: datetime
    last_used_at: datetime | None = None
    revoked_at: datetime | None = None


class ApiKeyCreate(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    scopes: list[Scope] = Field(default=["content:read"], min_length=1)


class ApiKeyCreated(BaseModel):
    key: ApiKey
    # shown once; only its hash is stored
    secret: str


class WebhookEndpoint(BaseModel):
    id: UUID
    workspace_id: UUID
    url: str
    events: list[WebhookEvent] = []
    created_at: datetime


class WebhookEndpointCreate(BaseModel):
    url: str = Field(max_length=500, pattern=r"^https://")
    events: list[WebhookEvent] = []


class WebhookEndpointCreated(BaseModel):
    endpoint: WebhookEndpoint
    # shown once: receivers verify X-CreatorOS-Signature with it
    secret: str


class WebhookDelivery(BaseModel):
    id: UUID
    endpoint_id: UUID
    event: str
    payload: dict[str, Any]
    status: Literal["pending", "sending", "delivered", "failed"] = "pending"
    attempts: int = 0
    next_attempt_at: datetime
    last_status_code: int | None = None
    created_at: datetime
