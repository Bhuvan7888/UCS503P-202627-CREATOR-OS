import warnings
from functools import lru_cache

import httpx
from supabase import Client, create_client

from shared.config import settings

# One client per key is shared by every request, and requests run their queries in parallel worker threads.
# supabase-py's sessions use HTTP/2 over a single connection, which is not safe across threads (parallel
# queries fail with "Resource temporarily unavailable"). HTTP/1.1 sessions with a connection pool are
# thread-safe, so the database and auth sessions are replaced with those.
POOL = httpx.Limits(max_connections=100, max_keepalive_connections=64)
TIMEOUT = httpx.Timeout(20.0, connect=5.0)


def _thread_safe(client: Client) -> Client:
    with warnings.catch_warnings():
        # supabase-py builds its own session with a deprecated `timeout` argument; we replace that session below
        warnings.simplefilter("ignore", DeprecationWarning)
        db = client.postgrest
    db.session = httpx.Client(
        base_url=db.session.base_url,
        headers=db.session.headers,
        timeout=TIMEOUT,
        limits=POOL,
        follow_redirects=True,
    )
    auth_http = httpx.Client(timeout=TIMEOUT, limits=POOL, follow_redirects=True)
    client.auth._http_client = auth_http
    client.auth.admin._http_client = auth_http
    return client


def _build_client(service_role: bool) -> Client:
    key = settings.SUPABASE_SERVICE_ROLE_KEY if service_role else settings.SUPABASE_ANON_KEY
    return _thread_safe(create_client(settings.SUPABASE_URL, key))


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
