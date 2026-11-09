from datetime import UTC, datetime
from uuid import UUID, uuid4

from features.activity_log import ActivityLog, ActivityLogRepo
from features.deliverables.models import (
    Deliverable,
    DeliverableCreateRequest,
    DeliverableStatusUpdateRequest,
)
from features.deliverables.repository import DeliverableRepo
from features.deliverables.rules import is_valid_deliverable_transition
from shared.errors import InvalidStatusTransition, PermissionDeniedError

_CREATOR_ALLOWED_STATUSES = {
    "pending",
    "in_production",
    "editing",
    "submitted",
    "revision_requested",
}
_BRAND_ALLOWED_STATUSES = {
    "pending",
    "in_production",
    "editing",
    "submitted",
    "approved",
    "revision_requested",
    "rejected",
}


class DeliverableService:
    def __init__(self, deliverable_repo: DeliverableRepo, activity_log_repo: ActivityLogRepo):
        self.deliverable_repo = deliverable_repo
        self.activity_log_repo = activity_log_repo

    async def create_deliverable(
        self, request: DeliverableCreateRequest, brand_id: UUID, actor_id: UUID, actor_type: str
    ) -> Deliverable:
        deliverable = Deliverable(
            id=uuid4(),
            deal_id=request.deal_id,
            contract_id=request.contract_id,
            title=request.title,
            description=request.description,
            status="pending",
            previous_status=None,
            file_path=None,
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
        )
        created = await self.deliverable_repo.create(deliverable)

        log = ActivityLog(
            id=uuid4(),
            brand_id=brand_id,
            deal_id=request.deal_id,
            actor_type=actor_type,
            actor_label=str(actor_id),
            action="deliverable_created",
            metadata={"deliverable_id": str(created.id), "title": created.title},
            created_at=datetime.now(UTC),
        )
        await self.activity_log_repo.create(log)

        return created

    async def list_for_brand(
        self, brand_id: UUID, limit: int = 50, offset: int = 0
    ) -> list[Deliverable]:
        return await self.deliverable_repo.list_for_brand(brand_id, limit, offset)

    async def list_for_creator(
        self, creator_id: UUID, limit: int = 50, offset: int = 0
    ) -> list[Deliverable]:
        return await self.deliverable_repo.list_for_creator(creator_id, limit, offset)

    async def update_status(
        self,
        deliverable_id: UUID,
        request: DeliverableStatusUpdateRequest,
        actor_id: UUID,
        actor_type: str,
        brand_id: UUID,
        deal_id: UUID,
        creator_id: UUID | None = None,
    ) -> Deliverable:
        deliverable = await self.deliverable_repo.get(deliverable_id)
        if not deliverable:
            raise ValueError("Deliverable not found")

        if actor_type == "creator":
            owned = await self.deliverable_repo.list_for_creator(creator_id, limit=1000)
            if not any(d.id == deliverable_id for d in owned):
                raise PermissionDeniedError("This deliverable isn't yours")
            if request.status not in _CREATOR_ALLOWED_STATUSES:
                raise PermissionDeniedError("Only the brand can approve or reject a deliverable")
        elif request.status not in _BRAND_ALLOWED_STATUSES:
            raise PermissionDeniedError("Only the creator can update production progress")

        if not is_valid_deliverable_transition(deliverable.status, request.status):
            raise InvalidStatusTransition("Deliverable", deliverable.status, request.status)

        new_previous_status = deliverable.previous_status
        if deliverable.status in ("in_production", "revision_requested") and request.status in (
            "editing",
            "submitted",
        ):
            new_previous_status = deliverable.status
        elif deliverable.status == "pending" and request.status in ("in_production", "editing"):
            new_previous_status = "pending"
        elif request.status in ("in_production", "revision_requested", "pending"):
            new_previous_status = None

        updated = await self.deliverable_repo.update_status(
            deliverable_id, request.status, previous_status=new_previous_status
        )

        log = ActivityLog(
            id=uuid4(),
            brand_id=brand_id,
            deal_id=deal_id,
            actor_type=actor_type,
            actor_label=str(actor_id),
            action="deliverable_status_updated",
            metadata={
                "deliverable_id": str(deliverable.id),
                "from_status": deliverable.status,
                "to_status": request.status,
                "note": request.note,
            },
            created_at=datetime.now(UTC),
        )
        await self.activity_log_repo.create(log)

        return updated
