"""Pure rules for API keys and webhooks: key format, scope → permission mapping, signatures, retries, URL safety."""

import hashlib
import hmac
import ipaddress
import secrets
import socket
from collections.abc import Sequence
from datetime import timedelta
from urllib.parse import urlparse

KEY_PREFIX = "cos_"
SCOPE_INFO: dict[str, str] = {
    "content:read": "Read ideas, scripts and content items",
    "content:write": "Create and edit ideas, scripts and content items",
    "publish:write": "Request a publish (it waits in Approvals for a person)",
    "channels:read": "See which platforms are connected",
    "analytics:read": "Read performance metrics",
    "webhooks:write": "Register endpoints to receive events",
    "owner": "Everything above. Cannot approve a publish, manage keys, invite members or change roles.",
}
_READ = ("view_dashboard", "view_kanban", "view_scripts", "view_schedule")
# Key-only permissions (humans use manage_workspace / create_content for these).
REQUEST_PUBLISH = "request_publish"
MANAGE_WEBHOOKS = "manage_webhooks"
SCOPE_PERMISSIONS: dict[str, tuple[str, ...]] = {
    "content:read": _READ,
    "content:write": (*_READ, "create_content", "edit_scripts"),
    "publish:write": ("view_schedule", REQUEST_PUBLISH),
    "channels:read": (),
    "analytics:read": ("view_analytics",),
    "webhooks:write": (MANAGE_WEBHOOKS,),
}
# Never reachable with a key, whatever its scopes (enforced by the mapping: none of these appear above).
HUMAN_ONLY = frozenset({"manage_workspace", "invite_members", "view_brand_deals", "view_settings"})

# ~15 hours of retries in total (1m, 5m, 15m, 1h, 2h, 4h, 8h)
RETRY_BACKOFF = [timedelta(minutes=m) for m in (1, 5, 15, 60, 120, 240, 480)]
DELIVERY_LEASE = timedelta(minutes=5)
DELIVERY_TIMEOUT_SECONDS = 10.0


def permissions_for_scopes(scopes: Sequence[str]) -> list[str]:
    effective = set(SCOPE_INFO) - {"owner"} if "owner" in scopes else set(scopes)
    return sorted({p for s in effective for p in SCOPE_PERMISSIONS.get(s, ())})


def new_api_key() -> tuple[str, str]:
    """(prefix, full secret). The prefix identifies the key in lists; the secret is shown once."""
    prefix = secrets.token_hex(4)
    return prefix, f"{KEY_PREFIX}{prefix}_{secrets.token_urlsafe(32)}"


def hash_secret(secret: str) -> str:
    return hashlib.sha256(secret.encode()).hexdigest()


def is_api_key(token: str) -> bool:
    return token.startswith(KEY_PREFIX)


def sign(secret: str, timestamp: str, body: bytes) -> str:
    """Value of X-CreatorOS-Signature: HMAC-SHA256 over "<timestamp>.<raw body>"."""
    mac = hmac.new(secret.encode(), f"{timestamp}.".encode() + body, hashlib.sha256)
    return f"sha256={mac.hexdigest()}"


def next_retry(attempts: int) -> timedelta | None:
    """Delay before the next try after `attempts` failures; None when we give up."""
    return RETRY_BACKOFF[attempts - 1] if attempts <= len(RETRY_BACKOFF) else None


def is_public_https_url(url: str) -> bool:
    """https only, and every address the host resolves to is public (no localhost, private or link-local)."""
    parsed = urlparse(url)
    if parsed.scheme != "https" or not parsed.hostname:
        return False
    try:
        infos = socket.getaddrinfo(parsed.hostname, parsed.port or 443, proto=socket.IPPROTO_TCP)
    except OSError:
        return False
    return bool(infos) and all(ipaddress.ip_address(info[4][0]).is_global for info in infos)
