from datetime import UTC, datetime
from uuid import UUID, uuid4

from features.creators import CreatorRepo
from features.workspaces.models import (
    MemberOut,
    MyWorkspace,
    Workspace,
    WorkspaceMember,
    WorkspaceRole,
)
from features.workspaces.repository import UserDirectory, WorkspaceRepo
from features.workspaces.rules import (
    MAX_WORKSPACES_PER_OWNER,
    PRIMARY_WORKSPACE_NAME,
    can_own_another_workspace,
    new_workspace_slug,
    parse_workspace_ref,
)
from shared.errors import DuplicateError, NotFoundError, PermissionDeniedError, ValidationError


class WorkspaceService:
    def __init__(
        self,
        workspace_repo: WorkspaceRepo,
        creator_repo: CreatorRepo,
        user_directory: UserDirectory | None = None,
    ):
        self.workspace_repo = workspace_repo
        self.creator_repo = creator_repo
        self.user_directory = user_directory

    async def list_for_user(self, user_id: UUID) -> list[MyWorkspace]:
        """The caller's workspaces. A creator always has one: it is created on first use."""
        creator = await self.creator_repo.get_by_user_id(user_id)
        if creator is not None:
            await self.ensure_primary_workspace(user_id, creator.id)
        return [
            MyWorkspace(**ws.model_dump(), role=role)
            for ws, role in await self.workspace_repo.list_for_user(user_id)
        ]

    async def ensure_primary_workspace(self, owner_user_id: UUID, creator_id: UUID) -> Workspace:
        """Idempotent and race-safe: concurrent first requests end with exactly one workspace."""
        existing = await self.workspace_repo.get_primary_for_owner(owner_user_id)
        if existing is not None:
            return existing
        try:
            return await self._create(
                owner_user_id, PRIMARY_WORKSPACE_NAME, creator_id=creator_id, is_primary=True
            )
        except DuplicateError:
            winner = await self.workspace_repo.get_primary_for_owner(owner_user_id)
            if winner is None:
                raise
            return winner

    async def create_workspace(self, owner_user_id: UUID, name: str) -> MyWorkspace:
        if not can_own_another_workspace(await self.workspace_repo.count_owned(owner_user_id)):
            raise ValidationError(f"You can own up to {MAX_WORKSPACES_PER_OWNER} workspaces")
        primary = await self.workspace_repo.get_primary_for_owner(owner_user_id)
        ws = await self._create(
            owner_user_id,
            name,
            creator_id=primary.creator_id if primary else None,
            is_primary=False,
        )
        return MyWorkspace(**ws.model_dump(), role="owner")

    async def get_for_member(self, ref: str, user_id: UUID) -> MyWorkspace:
        """Resolve a slug or id the caller is a member of. Raises NotFoundError / PermissionDeniedError."""
        ws_id = parse_workspace_ref(ref)
        ws = await (
            self.workspace_repo.get(ws_id) if ws_id else self.workspace_repo.get_by_slug(ref)
        )
        if ws is None:
            raise NotFoundError("Workspace not found")
        member = await self.workspace_repo.get_member(ws.id, user_id)
        if member is None:
            raise PermissionDeniedError("You are not a member of this workspace")
        return MyWorkspace(**ws.model_dump(), role=member.role)

    async def list_members(self, workspace_id: UUID) -> list[MemberOut]:
        members = await self.workspace_repo.list_members(workspace_id)
        names = (
            await self.user_directory.describe([m.user_id for m in members])
            if self.user_directory
            else {}
        )
        return [
            MemberOut(
                user_id=m.user_id,
                role=m.role,
                name=names.get(m.user_id, ("Member", None))[0],
                email=names.get(m.user_id, ("Member", None))[1],
            )
            for m in members
        ]

    async def _create(
        self, owner_user_id: UUID, name: str, *, creator_id: UUID | None, is_primary: bool
    ) -> Workspace:
        now = datetime.now(UTC)
        ws = await self.workspace_repo.create(
            Workspace(
                id=uuid4(),
                slug=new_workspace_slug(),
                name=name,
                owner_user_id=owner_user_id,
                creator_id=creator_id,
                is_primary=is_primary,
                created_at=now,
                updated_at=now,
            )
        )
        owner_role: WorkspaceRole = "owner"
        await self.workspace_repo.add_member(
            WorkspaceMember(
                workspace_id=ws.id, user_id=owner_user_id, role=owner_role, created_at=now
            )
        )
        return ws
