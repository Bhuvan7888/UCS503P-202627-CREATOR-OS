from datetime import UTC, datetime
from uuid import UUID, uuid4

from features.approvals.models import PublishRequest, PublishRequestCreate
from features.approvals.repository import PublishRequestRepo
from features.content import ContentService
from shared.errors import ConflictError, DuplicateError, NotFoundError

# Pending requests plus recent decisions shown on the Approvals page.
MAX_REQUESTS_LISTED = 200


class ApprovalService:
    """A signed-in person approves or rejects a publish. Approving marks the item Published —
    Creator OS posts nowhere; it records that the piece went live."""

    def __init__(self, request_repo: PublishRequestRepo, content: ContentService):
        self.request_repo = request_repo
        self.content = content

    async def list(self, workspace_id: UUID) -> list[PublishRequest]:
        return await self.request_repo.list_for_workspace(workspace_id, MAX_REQUESTS_LISTED)

    async def request(
        self,
        workspace_id: UUID,
        user_id: UUID,
        body: PublishRequestCreate,
        agent_name: str | None = None,
    ) -> PublishRequest:
        """A person's request, or an agent's (API key) when `agent_name` is given — never sent until approved."""
        item = await self.content.get(workspace_id, body.content_item_id)
        if item.stage == "published":
            raise ConflictError("This content is already published")
        try:
            return await self.request_repo.create(
                PublishRequest(
                    id=uuid4(),
                    workspace_id=workspace_id,
                    content_item_id=item.id,
                    requested_by=user_id,
                    source="agent" if agent_name else "human",
                    agent_name=agent_name,
                    note=(body.note or "").strip() or None,
                    created_at=datetime.now(UTC),
                )
            )
        except DuplicateError as e:
            raise ConflictError("A publish request for this content is already waiting") from e

    async def approve(self, workspace_id: UUID, request_id: UUID, user_id: UUID) -> PublishRequest:
        pending = await self._pending(workspace_id, request_id)
        decided = await self._decide(pending, "approved", user_id, None)
        await self.content.mark_published(workspace_id, pending.content_item_id)
        return decided

    async def reject(
        self, workspace_id: UUID, request_id: UUID, user_id: UUID, reason: str
    ) -> PublishRequest:
        pending = await self._pending(workspace_id, request_id)
        return await self._decide(pending, "rejected", user_id, reason.strip())

    async def _pending(self, workspace_id: UUID, request_id: UUID) -> PublishRequest:
        req = await self.request_repo.get(request_id)
        if req is None or req.workspace_id != workspace_id:
            raise NotFoundError("Publish request not found")
        if req.status != "pending":
            raise ConflictError("This request has already been decided")
        return req

    async def _decide(
        self, req: PublishRequest, status: str, user_id: UUID, reason: str | None
    ) -> PublishRequest:
        decided = await self.request_repo.decide(
            req.id,
            {
                "status": status,
                "reason": reason,
                "decided_by": user_id,
                "decided_at": datetime.now(UTC),
            },
        )
        if decided is None:  # someone else decided it a moment ago
            raise ConflictError("This request has already been decided")
        return decided
