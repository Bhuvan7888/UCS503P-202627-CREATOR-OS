"""Workspace rules: addresses, trial length and slot limits."""

import secrets
from uuid import UUID

# Workspaces one owner may hold on the base plan (Billing shows "1 of 3").
WORKSPACE_SLOTS = 3
TRIAL_DAYS = 10
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


def has_free_slot(owned_count: int) -> bool:
    return owned_count < WORKSPACE_SLOTS
