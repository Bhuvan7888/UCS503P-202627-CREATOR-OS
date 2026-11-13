"""Workspaces: a creator's workspace(s) and their members (team model: Owner, Script Writer, Video Editor, Brand Manager).

Public API of this feature. Other packages import from here, never from submodules.
"""

from features.workspaces.models import MyWorkspace, Workspace, WorkspaceMember, WorkspaceRole
from features.workspaces.repository import WorkspaceRepo
from features.workspaces.rules import MAX_WORKSPACES_PER_OWNER, parse_workspace_ref
from features.workspaces.service import WorkspaceService

__all__ = [
    "MAX_WORKSPACES_PER_OWNER",
    "MyWorkspace",
    "Workspace",
    "WorkspaceMember",
    "WorkspaceRepo",
    "WorkspaceRole",
    "WorkspaceService",
    "parse_workspace_ref",
]
