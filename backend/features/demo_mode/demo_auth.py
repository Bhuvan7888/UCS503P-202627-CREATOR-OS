"""Demo-account login and demo-token resolution, enabled only on the offline demo dataset outside production (see mode.demo_access_enabled)."""

import hmac

from features.auth import AuthSession
from features.demo_mode.accounts import DEMO_BRANDS, DEMO_CREATORS, DEMO_PASSWORD
from features.demo_mode.demo_store import store
from features.demo_mode.mode import demo_access_enabled


def _demo_login_allowed(password: str) -> bool:
    return demo_access_enabled() and hmac.compare_digest(password, DEMO_PASSWORD)


def authenticate_demo_brand(email: str, password: str) -> AuthSession | None:
    if not _demo_login_allowed(password):
        return None
    store.seed_if_needed()
    info = DEMO_BRANDS.get(email.lower().strip())
    if not info:
        return None
    return AuthSession(
        access_token=f"demo-token-brand-{info['brand_id']}",
        refresh_token=f"demo-refresh-{info['brand_id']}",
        user_id=info["user_id"],
        role="brand",
        brand_id=info["brand_id"],
        brand_name=info["name"],
    )


def authenticate_demo_creator(email: str, password: str) -> AuthSession | None:
    if not _demo_login_allowed(password):
        return None
    store.seed_if_needed()
    info = DEMO_CREATORS.get(email.lower().strip())
    if not info:
        return None
    return AuthSession(
        access_token=f"demo-token-creator-{info['creator_id']}",
        refresh_token=f"demo-refresh-{info['creator_id']}",
        user_id=info["user_id"],
        role="creator",
        brand_id=info["brand_id"],
        creator_id=info["creator_id"],
        display_name=info["display_name"],
    )


def resolve_demo_actor(token: str):
    if not demo_access_enabled():
        return None
    store.seed_if_needed()
    from features.auth.dependencies import ActorContext

    # Check brand tokens
    for info in DEMO_BRANDS.values():
        if token == f"demo-token-brand-{info['brand_id']}":
            return ActorContext(
                user_id=info["user_id"], actor_type="brand", brand_id=info["brand_id"]
            )

    # Check creator tokens
    for info in DEMO_CREATORS.values():
        if token == f"demo-token-creator-{info['creator_id']}":
            return ActorContext(
                user_id=info["user_id"],
                actor_type="creator",
                brand_id=info["brand_id"],
                creator_id=info["creator_id"],
            )

    return None
