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


# --- Team: roles, permissions, seats --------------------------------------------------------------

PERMISSIONS: tuple[str, ...] = (
    "create_content",
    "edit_scripts",
    "invite_members",
    "manage_workspace",
    "view_analytics",
    "view_brand_deals",
    "view_dashboard",
    "view_kanban",
    "view_schedule",
    "view_scripts",
    "view_settings",
)
# Defaults per member role (5, 6 and 8 of 11, as in the spec); each workspace's owner can change them.
DEFAULT_ROLE_PERMISSIONS: dict[str, tuple[str, ...]] = {
    "script_writer": (
        "view_dashboard",
        "view_kanban",
        "view_scripts",
        "edit_scripts",
        "view_schedule",
    ),
    "video_editor": (
        "view_dashboard",
        "view_kanban",
        "create_content",
        "view_scripts",
        "edit_scripts",
        "view_schedule",
    ),
    "brand_manager": (
        "view_dashboard",
        "view_kanban",
        "create_content",
        "view_scripts",
        "view_schedule",
        "view_brand_deals",
        "view_analytics",
        "view_settings",
    ),
}
MEMBER_ROLES: tuple[str, ...] = tuple(DEFAULT_ROLE_PERMISSIONS)
SEATS_PER_ROLE = 2
INVITE_TTL_DAYS = 7
# "Opened the workspace" is logged at most once per person per this many minutes.
OPEN_LOG_INTERVAL_MINUTES = 30


def effective_permissions(role: str, overrides: dict[str, list[str]]) -> list[str]:
    """The owner always has everything; other roles use the workspace's set, else the defaults."""
    if role == "owner":
        return list(PERMISSIONS)
    granted = overrides.get(role, DEFAULT_ROLE_PERMISSIONS.get(role, ()))
    return [p for p in PERMISSIONS if p in granted]


def seats_left(role: str, members_in_role: int, open_invites_in_role: int) -> int:
    return max(0, SEATS_PER_ROLE - members_in_role - open_invites_in_role)


def hash_invite_token(token: str) -> str:
    import hashlib

    return hashlib.sha256(token.encode()).hexdigest()


def new_invite_token() -> str:
    return secrets.token_urlsafe(32)
