from datetime import UTC, datetime
from uuid import UUID, uuid4

from features.content.models import (
    ContentItem,
    ContentItemCreate,
    ContentItemUpdate,
    ContentScript,
    ContentStats,
)
from features.content.repository import ContentRepo, ScriptRepo
from features.content.rules import MAX_ITEMS_PER_WORKSPACE_VIEW, apply_stage_rules, content_stats
from features.crm import CrmDealRepo
from features.workspaces import WorkspaceRepo
from shared.errors import NotFoundError, ValidationError

# Fields a PATCH may change but never clear.
_REQUIRED_FIELDS = {"title", "type", "pillar", "hook", "target_platforms", "stage"}


class ContentService:
    def __init__(
        self,
        content_repo: ContentRepo,
        workspace_repo: WorkspaceRepo,
        script_repo: ScriptRepo,
        crm_repo: CrmDealRepo,
    ):
        self.content_repo = content_repo
        self.workspace_repo = workspace_repo
        self.script_repo = script_repo
        self.crm_repo = crm_repo

    async def list(self, workspace_id: UUID) -> list[ContentItem]:
        return await self.content_repo.list_for_workspace(
            workspace_id, MAX_ITEMS_PER_WORKSPACE_VIEW
        )

    async def stats(self, workspace_id: UUID) -> ContentStats:
        items = await self.list(workspace_id)
        scripted = await self.script_repo.scripted_item_ids(workspace_id)
        return content_stats(items, datetime.now(UTC), scripted)

    async def create(
        self, workspace_id: UUID, user_id: UUID, request: ContentItemCreate
    ) -> ContentItem:
        await self._check_assignee(workspace_id, request.assignee_user_id)
        await self._check_deal(workspace_id, request.crm_deal_id)
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

    async def get(self, workspace_id: UUID, item_id: UUID) -> ContentItem:
        """An item of this workspace; items of other workspaces are reported as not found."""
        item = await self.content_repo.get(item_id)
        if item is None or item.workspace_id != workspace_id:
            raise NotFoundError("Content item not found")
        return item

    async def update(
        self, workspace_id: UUID, item_id: UUID, request: ContentItemUpdate
    ) -> ContentItem:
        item = await self.get(workspace_id, item_id)
        changes = request.model_dump(exclude_unset=True)
        cleared = sorted(k for k in _REQUIRED_FIELDS if k in changes and changes[k] is None)
        if cleared:
            raise ValidationError(f"These fields cannot be empty: {', '.join(cleared)}")
        if not changes:
            return item
        if changes.get("assignee_user_id") is not None:
            await self._check_assignee(workspace_id, changes["assignee_user_id"])
        await self._check_deal(workspace_id, changes.get("crm_deal_id"))
        now = datetime.now(UTC)
        changes = apply_stage_rules(item, changes, now)
        changes["updated_at"] = now
        return await self.content_repo.update(item_id, changes)

    async def mark_published(self, workspace_id: UUID, item_id: UUID) -> ContentItem:
        return await self.update(workspace_id, item_id, ContentItemUpdate(stage="published"))

    async def get_script(self, workspace_id: UUID, item_id: UUID) -> ContentScript:
        await self.get(workspace_id, item_id)
        script = await self.script_repo.get(item_id)
        return script or ContentScript(content_item_id=item_id, workspace_id=workspace_id)

    async def save_script(
        self, workspace_id: UUID, item_id: UUID, user_id: UUID, body: str
    ) -> ContentScript:
        """Auto-save. The first non-empty script moves an idea to the Scripted column."""
        item = await self.get(workspace_id, item_id)
        now = datetime.now(UTC)
        saved = await self.script_repo.upsert(
            ContentScript(
                content_item_id=item_id,
                workspace_id=workspace_id,
                body=body,
                updated_by=user_id,
                updated_at=now,
            )
        )
        if body.strip() and item.stage == "idea":
            await self.content_repo.update(item_id, {"stage": "scripted", "updated_at": now})
        return saved

    async def _check_deal(self, workspace_id: UUID, deal_id: UUID | None) -> None:
        if deal_id is None:
            return
        deal = await self.crm_repo.get(deal_id)
        if deal is None or deal.workspace_id != workspace_id:
            raise ValidationError("The deal is not in this workspace")

    async def _check_assignee(self, workspace_id: UUID, user_id: UUID | None) -> None:
        if (
            user_id is not None
            and await self.workspace_repo.get_member(workspace_id, user_id) is None
        ):
            raise ValidationError("The assignee is not a member of this workspace")
