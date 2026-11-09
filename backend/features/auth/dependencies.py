import asyncio
import logging
import time
from uuid import UUID

from fastapi import Header, HTTPException

from features.brands.supabase_repository import SupabaseBrandMemberRepo
from features.creators.supabase_repository import SupabaseCreatorRepo
from shared.supabase_client import get_supabase_client

logger = logging.getLogger(__name__)

# A single page load fires several API calls on the same token, and each one
# was independently paying ~3 sequential Supabase round trips (~700ms+) just
# to re-resolve the same identity. Caching the resolved actor per token turns
# every call after the first into a pure in-memory hit.
# ponytail: unbounded dict keyed by token string, only evicted lazily on
# access past TTL — fine for demo-scale traffic; a background sweep or an
# LRU cap is the upgrade if this runs long-lived with many distinct users.
_ACTOR_CACHE_TTL_SECONDS = 30.0
_actor_cache: dict[str, tuple["ActorContext", float]] = {}


class ActorContext:
    def __init__(
        self,
        user_id: UUID,
        actor_type: str,
        brand_id: UUID,
        creator_id: UUID | None = None,
    ):
        self.user_id = user_id
        self.actor_id = user_id
        self.actor_type = actor_type
        self.brand_id = brand_id
        self.creator_id = creator_id


def _extract_token(authorization: str | None) -> str:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")
    return authorization.split(" ", 1)[1]


async def _validate_user(token: str) -> UUID:
    client = get_supabase_client(service_role=True)
    try:
        res = await asyncio.to_thread(client.auth.get_user, token)
    except Exception as e:
        logger.warning("Token validation failed: %s", e)
        res = None
    if not res or not res.user:
        raise HTTPException(status_code=401, detail="Invalid or expired session")
    return UUID(res.user.id)


async def get_current_actor(authorization: str | None = Header(default=None)) -> ActorContext:
    """Resolves the caller's session to either a brand or a creator identity."""
    token = _extract_token(authorization)

    from features.demo_mode import resolve_demo_actor

    demo_actor = resolve_demo_actor(token)
    if demo_actor:
        return demo_actor

    cached = _actor_cache.get(token)
    if cached and cached[1] > time.monotonic():
        return cached[0]

    user_id = await _validate_user(token)
    client = get_supabase_client(service_role=True)

    # Independent lookups (a user is never both) — run concurrently instead
    # of paying two sequential round trips for the common creator case.
    member, creator = await asyncio.gather(
        SupabaseBrandMemberRepo(client).get_by_user_id(user_id),
        SupabaseCreatorRepo(client).get_by_user_id(user_id),
    )

    if member:
        actor = ActorContext(user_id=user_id, actor_type="brand", brand_id=member.brand_id)
    elif creator:
        actor = ActorContext(
            user_id=user_id, actor_type="creator", brand_id=creator.brand_id, creator_id=creator.id
        )
    else:
        raise HTTPException(
            status_code=403, detail="This account is not linked to a brand or creator profile"
        )

    _actor_cache[token] = (actor, time.monotonic() + _ACTOR_CACHE_TTL_SECONDS)
    return actor


async def get_current_brand(authorization: str | None = Header(default=None)) -> ActorContext:
    """Like get_current_actor, but rejects anyone who isn't a brand member."""
    actor = await get_current_actor(authorization)
    if actor.actor_type != "brand":
        raise HTTPException(status_code=403, detail="This action requires a brand account")
    return actor
