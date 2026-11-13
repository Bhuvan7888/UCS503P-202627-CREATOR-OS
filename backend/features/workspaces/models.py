from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field

WorkspaceRole = Literal["owner", "script_writer", "video_editor", "brand_manager"]


class Workspace(BaseModel):
    id: UUID
    slug: str
    name: str
    owner_user_id: UUID
    creator_id: UUID | None = None
    is_primary: bool = False
    created_at: datetime
    updated_at: datetime


class WorkspaceMember(BaseModel):
    workspace_id: UUID
    user_id: UUID
    role: WorkspaceRole
    created_at: datetime


class MyWorkspace(Workspace):
    """A workspace as seen by one of its members: the caller's role and what that role may do."""

    role: WorkspaceRole
    permissions: list[str] = []


class MemberOut(BaseModel):
    user_id: UUID
    role: WorkspaceRole
    name: str
    email: str | None = None


class WorkspaceCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=80)


MemberRole = Literal["script_writer", "video_editor", "brand_manager"]


class WorkspaceRename(BaseModel):
    name: str = Field(min_length=1, max_length=80)


class InviteCreate(BaseModel):
    email: str = Field(max_length=254, pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
    role: MemberRole


class Invite(BaseModel):
    id: UUID
    workspace_id: UUID
    email: str
    role: MemberRole
    invited_by: UUID | None = None
    created_at: datetime
    expires_at: datetime
    accepted_at: datetime | None = None


class InviteCreated(BaseModel):
    invite: Invite
    # shown once: the link is the only way to accept, and only its hash is stored
    accept_path: str
    emailed: bool


class InvitePreview(BaseModel):
    workspace_name: str
    role: MemberRole
    email: str
    expired: bool
    accepted: bool


class MemberRoleUpdate(BaseModel):
    role: MemberRole


class RolePermissions(BaseModel):
    role: MemberRole
    permissions: list[str]
    seats_used: int
    seats_total: int


class RolePermissionsUpdate(BaseModel):
    permissions: list[str]


class AuditEntry(BaseModel):
    id: UUID
    workspace_id: UUID
    actor_user_id: UUID | None = None
    actor_label: str
    action: str
    subject: str = ""
    outcome: Literal["allowed", "denied"]
    created_at: datetime
