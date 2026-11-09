from functools import lru_cache

from supabase import Client, create_client

from shared.config import settings


def _build_client(service_role: bool) -> Client:
    key = settings.SUPABASE_SERVICE_ROLE_KEY if service_role else settings.SUPABASE_ANON_KEY
    return create_client(settings.SUPABASE_URL, key)


@lru_cache(maxsize=2)
def _cached_client(service_role: bool) -> Client:
    return _build_client(service_role)


def get_supabase_client(service_role: bool = False, fresh: bool = False) -> Client:
    # Reused across requests: create_client() opens a fresh TLS connection per
    # call, and every router was calling it 3-4x per request (once to validate
    # the token, once to resolve the actor, once+ for the actual query) — that
    # was the entire cause of ~1-1.5s per API call. Pass fresh=True only for a
    # client that will call a session-mutating method like sign_in_with_password
    # (AuthService), since that would otherwise leak one user's session onto
    # every other request sharing the cached client.
    if fresh:
        return _build_client(service_role)
    return _cached_client(service_role)
