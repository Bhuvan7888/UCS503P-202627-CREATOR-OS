"""Request-time access helpers for deal-scoped endpoints (used by other features' routers)."""

from uuid import UUID

from fastapi import HTTPException

from features.auth.dependencies import ActorContext
from features.deals.models import Deal
from features.deals.repository import DealRepo
from features.deals.rules import can_access_deal
from features.deals.supabase_repository import SupabaseDealRepo
from shared.supabase_client import get_supabase_client


def get_deal_repo() -> DealRepo:
    """Deal repository used for access checks (tests replace this with a fake)."""
    return SupabaseDealRepo(get_supabase_client(service_role=True))


async def load_accessible_deal(deal_id: UUID, actor: ActorContext) -> Deal:
    """Return the deal, or raise 404 if it doesn't exist / 403 if the caller isn't on it."""
    deal = await get_deal_repo().get(deal_id)
    if deal is None:
        raise HTTPException(status_code=404, detail="Deal not found")
    if not can_access_deal(deal, actor.actor_type, actor.brand_id, actor.creator_id):
        raise HTTPException(status_code=403, detail="This deal isn't yours")
    return deal
