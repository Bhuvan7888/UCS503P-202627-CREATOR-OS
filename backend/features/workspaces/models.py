from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field

WorkspaceRole = Literal["owner", "script_writer", "video_editor", "brand_manager"]
WorkspacePlan = Literal["trial", "monthly", "yearly"]


class Workspace(BaseModel):
    id: UUID
    slug: str
    name: str
    owner_user_id: UUID
    creator_id: UUID | None = None
    is_primary: bool = False
    plan: WorkspacePlan = "trial"
    trial_ends_at: datetime | None = None
    created_at: datetime
    updated_at: datetime


class WorkspaceMember(BaseModel):
    workspace_id: UUID
    user_id: UUID
    role: WorkspaceRole
    created_at: datetime


class MyWorkspace(Workspace):
    """A workspace as seen by one of its members: includes the caller's role."""

    role: WorkspaceRole


class WorkspaceCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=80)
