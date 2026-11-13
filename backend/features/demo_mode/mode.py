"""Decides whether the backend runs on Supabase or on the in-memory demo dataset."""

import socket
from urllib.parse import urlparse

from shared.config import settings

# How long to wait for Supabase's port before falling back to demo mode.
SUPABASE_PROBE_TIMEOUT_SECONDS = 0.3

# --- Check Supabase Availability ---
_supabase_available: bool | None = None


def is_demo_mode() -> bool:
    global _supabase_available
    if _supabase_available is not None:
        return not _supabase_available

    # If keys are dummy, treat as demo mode immediately
    if (
        "dummy" in settings.SUPABASE_ANON_KEY.lower()
        or "dummy" in settings.SUPABASE_SERVICE_ROLE_KEY.lower()
    ):
        _supabase_available = False
        return True

    try:
        parsed = urlparse(settings.SUPABASE_URL)
        host = parsed.hostname or "127.0.0.1"
        port = parsed.port or (443 if parsed.scheme == "https" else 80)
        with socket.create_connection((host, port), timeout=SUPABASE_PROBE_TIMEOUT_SECONDS):
            _supabase_available = True
            return False
    except Exception:
        _supabase_available = False
        return True


def demo_access_enabled() -> bool:
    """Demo accounts work only on the offline demo dataset, and never in production."""
    return is_demo_mode() and not settings.is_production
