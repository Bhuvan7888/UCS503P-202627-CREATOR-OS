"""Passwordless demo login and demo-token resolution. Active in every environment today; see AUDIT.md section 1.5 (security)."""

from domain.models.auth import AuthSession
from features.demo_mode.accounts import DEMO_BRANDS, DEMO_CREATORS
from features.demo_mode.demo_store import store


def authenticate_demo_brand(email: str) -> AuthSession | None:
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


def authenticate_demo_creator(email: str) -> AuthSession | None:
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
    store.seed_if_needed()
    from interface.dependencies import ActorContext

    # Check brand tokens
    for info in DEMO_BRANDS.values():
        if token in (f"demo-token-brand-{info['brand_id']}", str(info["user_id"])):
            return ActorContext(user_id=info["user_id"], actor_type="brand", brand_id=info["brand_id"])

    # Check creator tokens
    for info in DEMO_CREATORS.values():
        if token in (f"demo-token-creator-{info['creator_id']}", str(info["user_id"])):
            return ActorContext(
                user_id=info["user_id"],
                actor_type="creator",
                brand_id=info["brand_id"],
                creator_id=info["creator_id"],
            )

    return None
