"""Workspace rules: addresses and how many workspaces one person may own."""

import secrets
from uuid import UUID

# Creator OS is free for everyone; this is a fair-use cap, not a plan limit.
MAX_WORKSPACES_PER_OWNER = 3
PRIMARY_WORKSPACE_NAME = "My Workspace"


def new_workspace_slug() -> str:
    """Short public address, e.g. ws-d45f69f0."""
    return f"ws-{secrets.token_hex(4)}"


def parse_workspace_ref(ref: str) -> UUID | None:
    """URLs may name a workspace by slug or by id; return the id when `ref` is one."""
    try:
        return UUID(ref)
    except ValueError:
        return None


def can_own_another_workspace(owned_count: int) -> bool:
    return owned_count < MAX_WORKSPACES_PER_OWNER
