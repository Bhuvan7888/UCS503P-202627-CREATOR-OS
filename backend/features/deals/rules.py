"""Deal access rule: the one place that decides who may see or change a deal."""

from uuid import UUID

from features.deals.models import Deal


def can_access_deal(
    deal: Deal, actor_type: str, brand_id: UUID | None, creator_id: UUID | None
) -> bool:
    """The brand that owns the deal, or the creator the deal is with."""
    if actor_type == "brand":
        return deal.brand_id is not None and deal.brand_id == brand_id
    return creator_id is not None and deal.creator_id == creator_id
