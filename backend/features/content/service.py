from datetime import UTC, datetime
from uuid import UUID, uuid4

from features.content.models import (
    ContentItem,
    ContentItemCreate,
    ContentItemUpdate,
    ContentStats,
)
from features.content.repository import ContentRepo
from features.content.rules import MAX_ITEMS_PER_WORKSPACE_VIEW, content_stats
from features.workspaces import WorkspaceRepo
from shared.errors import NotFoundError, ValidationError

# Fields a PATCH may change but never clear.
_REQUIRED_FIELDS = {"title", "type", "pillar", "hook", "target_platforms", "stage"}


class ContentService:
    def __init__(self, content_repo: ContentRepo, workspace_repo: WorkspaceRepo):
        self.content_repo = content_repo
        self.workspace_repo = workspace_repo

    async def list(self, workspace_id: UUID) -> list[ContentItem]:
        return await self.content_repo.list_for_workspace(
            workspace_id, MAX_ITEMS_PER_WORKSPACE_VIEW
        )

    async def stats(self, workspace_id: UUID) -> ContentStats:
        return content_stats(await self.list(workspace_id), datetime.now(UTC))

    async def create(
        self, workspace_id: UUID, user_id: UUID, request: ContentItemCreate
    ) -> ContentItem:
        await self._check_assignee(workspace_id, request.assignee_user_id)
        now = datetime.now(UTC)
        return await self.content_repo.create(
            ContentItem(
                id=uuid4(),
                workspace_id=workspace_id,
                **request.model_dump(),
                stage="idea",
                created_by=user_id,
                created_at=now,
                updated_at=now,
            )
        )

    async def update(
        self, workspace_id: UUID, item_id: UUID, request: ContentItemUpdate
    ) -> ContentItem:
        item = await self.content_repo.get(item_id)
        if item is None or item.workspace_id != workspace_id:
            raise NotFoundError("Content item not found")
        changes = request.model_dump(exclude_unset=True)
        cleared = sorted(k for k in _REQUIRED_FIELDS if k in changes and changes[k] is None)
        if cleared:
            raise ValidationError(f"These fields cannot be empty: {', '.join(cleared)}")
        if not changes:
            return item
        if changes.get("assignee_user_id") is not None:
            await self._check_assignee(workspace_id, changes["assignee_user_id"])
        changes["updated_at"] = datetime.now(UTC)
        return await self.content_repo.update(item_id, changes)

    async def _check_assignee(self, workspace_id: UUID, user_id: UUID | None) -> None:
        if (
            user_id is not None
            and await self.workspace_repo.get_member(workspace_id, user_id) is None
        ):
            raise ValidationError("The assignee is not a member of this workspace")
