from datetime import UTC, datetime
from uuid import UUID, uuid4

from features.brands import BrandRepo
from features.crm.models import CrmDeal, CrmDealCreate, CrmDealUpdate, CrmStats, PlatformDeal
from features.crm.repository import CrmDealRepo
from features.crm.rules import MAX_DEALS_PER_WORKSPACE_VIEW, crm_stats
from features.deals import DealRepo
from shared.errors import NotFoundError, ValidationError

_REQUIRED_FIELDS = {"company_name", "deal_size", "currency", "status", "priority", "tags"}


class CrmService:
    def __init__(self, crm_repo: CrmDealRepo, deal_repo: DealRepo, brand_repo: BrandRepo):
        self.crm_repo = crm_repo
        self.deal_repo = deal_repo
        self.brand_repo = brand_repo

    async def list_deals(self, workspace_id: UUID) -> list[CrmDeal]:
        return await self.crm_repo.list_for_workspace(workspace_id, MAX_DEALS_PER_WORKSPACE_VIEW)

    async def stats(self, workspace_id: UUID) -> CrmStats:
        return crm_stats(await self.list_deals(workspace_id), datetime.now(UTC).date())

    async def get(self, workspace_id: UUID, deal_id: UUID) -> CrmDeal:
        """A deal of this workspace; other workspaces' deals are reported as not found."""
        deal = await self.crm_repo.get(deal_id)
        if deal is None or deal.workspace_id != workspace_id:
            raise NotFoundError("Deal not found")
        return deal

    async def create(self, workspace_id: UUID, user_id: UUID, request: CrmDealCreate) -> CrmDeal:
        now = datetime.now(UTC)
        return await self.crm_repo.create(
            CrmDeal(
                id=uuid4(),
                workspace_id=workspace_id,
                created_by=user_id,
                created_at=now,
                updated_at=now,
                **request.model_dump(),
            )
        )

    async def update(self, workspace_id: UUID, deal_id: UUID, request: CrmDealUpdate) -> CrmDeal:
        deal = await self.get(workspace_id, deal_id)
        changes = request.model_dump(exclude_unset=True)
        cleared = sorted(k for k in _REQUIRED_FIELDS if k in changes and changes[k] is None)
        if cleared:
            raise ValidationError(f"These fields cannot be empty: {', '.join(cleared)}")
        if not changes:
            return deal
        changes["updated_at"] = datetime.now(UTC)
        return await self.crm_repo.update(deal_id, changes)

    async def delete(self, workspace_id: UUID, deal_id: UUID) -> None:
        await self.get(workspace_id, deal_id)
        await self.crm_repo.delete(deal_id)

    async def platform_deals(self, creator_id: UUID | None) -> list[PlatformDeal]:
        """Deals brands made with this workspace's creator on Creator OS (read-only here)."""
        if creator_id is None:
            return []
        deals = await self.deal_repo.list_for_creator(creator_id, limit=200)
        names: dict[UUID, str] = {}
        for brand_id in {d.brand_id for d in deals if d.brand_id}:
            brand = await self.brand_repo.get(brand_id)
            names[brand_id] = brand.name if brand else "Brand"
        return [
            PlatformDeal(
                id=d.id,
                brand_name=names.get(d.brand_id, "Own project") if d.brand_id else "Own project",
                campaign_name=d.campaign_name,
                status=d.status,
                value_inr=d.value_inr,
                updated_at=d.updated_at,
            )
            for d in deals
        ]
