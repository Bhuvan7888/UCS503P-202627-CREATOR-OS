import asyncio
import logging
import time
from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4

from features.creators import CreatorRepo
from features.workspaces.models import (
    AuditEntry,
    Invite,
    InviteCreated,
    InvitePreview,
    MemberOut,
    MemberRole,
    MyWorkspace,
    RolePermissions,
    Workspace,
    WorkspaceMember,
    WorkspaceRole,
)
from features.workspaces.repository import AuditRepo, TeamRepo, UserDirectory, WorkspaceRepo
from features.workspaces.rules import (
    INVITE_TTL_DAYS,
    MAX_WORKSPACES_PER_OWNER,
    MEMBER_ROLES,
    OPEN_LOG_INTERVAL_MINUTES,
    PERMISSIONS,
    PRIMARY_WORKSPACE_NAME,
    SEATS_PER_ROLE,
    can_own_another_workspace,
    effective_permissions,
    hash_invite_token,
    new_invite_token,
    new_workspace_slug,
    parse_workspace_ref,
    seats_left,
)
from shared.email.email_port import EmailPort
from shared.errors import (
    ConflictError,
    DuplicateError,
    NotFoundError,
    PermissionDeniedError,
    ValidationError,
)

logger = logging.getLogger(__name__)

MEMBERSHIP_CACHE_SECONDS = 15


class MembershipCache:
    """Per-process cache of "this person's view of this workspace" (role + permissions).

    Every workspace request needs it, and resolving it costs database round trips. Entries live
    MEMBERSHIP_CACHE_SECONDS and are dropped at once when this process changes the team (role change,
    removal, permission edit, rename). ponytail: with several API processes another process may serve a
    changed role for up to MEMBERSHIP_CACHE_SECONDS; move to Redis pub/sub if that ever matters.
    """

    def __init__(self) -> None:
        self._entries: dict[tuple[UUID, str], tuple[MyWorkspace, float]] = {}

    def get(self, user_id: UUID, ref: str) -> MyWorkspace | None:
        found = self._entries.get((user_id, ref))
        return found[0] if found and found[1] > time.monotonic() else None

    def put(self, user_id: UUID, mine: MyWorkspace) -> None:
        expires = time.monotonic() + MEMBERSHIP_CACHE_SECONDS
        for ref in (mine.slug, str(mine.id)):
            self._entries[(user_id, ref)] = (mine, expires)

    def invalidate(self, workspace_id: UUID) -> None:
        for key, (mine, _) in list(self._entries.items()):
            if mine.id == workspace_id:
                self._entries.pop(key, None)


membership_cache = MembershipCache()
# (workspace, person) -> when this process last recorded "Opened the workspace"
_recent_opens: dict[tuple[UUID, UUID], float] = {}


class WorkspaceService:
    def __init__(
        self,
        workspace_repo: WorkspaceRepo,
        creator_repo: CreatorRepo,
        user_directory: UserDirectory | None = None,
        team_repo: TeamRepo | None = None,
    ):
        self.workspace_repo = workspace_repo
        self.creator_repo = creator_repo
        self.user_directory = user_directory
        # without a team store every member role uses the default permissions
        self.team_repo = team_repo

    async def _mine(self, ws: Workspace, role: WorkspaceRole) -> MyWorkspace:
        overrides = (
            await self.team_repo.get_role_permissions(ws.id)
            if self.team_repo and role != "owner"
            else {}
        )
        return MyWorkspace(
            **ws.model_dump(), role=role, permissions=effective_permissions(role, overrides)
        )

    async def list_for_user(self, user_id: UUID) -> list[MyWorkspace]:
        """The caller's workspaces. A creator always has one: it is created on first use."""
        rows = await self.workspace_repo.list_for_user(user_id)
        if not any(ws.is_primary and ws.owner_user_id == user_id for ws, _ in rows):
            # first visit (or not a creator): only then look for a creator profile to create one
            creator = await self.creator_repo.get_by_user_id(user_id)
            if creator is not None:
                await self.ensure_primary_workspace(user_id, creator.id)
                rows = await self.workspace_repo.list_for_user(user_id)
        return list(await asyncio.gather(*(self._mine(ws, role) for ws, role in rows)))

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
        return await self._mine(ws, "owner")

    async def resolve(self, ref: str) -> Workspace:
        """A workspace by slug or id. Raises NotFoundError."""
        ws_id = parse_workspace_ref(ref)
        ws = await (
            self.workspace_repo.get(ws_id) if ws_id else self.workspace_repo.get_by_slug(ref)
        )
        if ws is None:
            raise NotFoundError("Workspace not found")
        return ws

    async def get_for_member(self, ref: str, user_id: UUID) -> MyWorkspace:
        """Resolve a slug or id the caller is a member of. Raises NotFoundError / PermissionDeniedError."""
        cached = membership_cache.get(user_id, ref)
        if cached is not None:
            return cached
        found = await self.workspace_repo.get_membership(ref, user_id)  # one round trip
        if found is None:
            await self.resolve(ref)  # 404 when the workspace doesn't exist at all
            raise PermissionDeniedError("You are not a member of this workspace")
        mine = await self._mine(*found)
        membership_cache.put(user_id, mine)
        return mine

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


class TeamService:
    """Members, invitations, role permissions, renaming and the audit log of one workspace.

    Owner-only: changing roles, removing members and editing role permissions — so no member can
    grant themselves more access. Inviting needs the invite_members permission.
    """

    def __init__(
        self,
        workspace_repo: WorkspaceRepo,
        team_repo: TeamRepo,
        audit_repo: AuditRepo,
        user_directory: UserDirectory,
        email: EmailPort | None,
        app_url: str,
    ):
        self.workspace_repo = workspace_repo
        self.team_repo = team_repo
        self.audit_repo = audit_repo
        self.user_directory = user_directory
        self.email = email
        self.app_url = app_url.rstrip("/")

    # --- audit -------------------------------------------------------------------------------
    async def record(
        self,
        ws: MyWorkspace,
        user_id: UUID,
        action: str,
        subject: str = "",
        outcome: str = "allowed",
        label: str | None = None,
    ) -> None:
        """`label` names a non-person actor (an API key); people are looked up by id."""
        name, email = (
            (label, None)
            if label
            else (await self.user_directory.describe([user_id])).get(user_id, ("Member", None))
        )
        await self.audit_repo.add(
            AuditEntry(
                id=uuid4(),
                workspace_id=ws.id,
                actor_user_id=user_id,
                actor_label=f"{name} ({email})" if email else name,
                action=action,
                subject=subject[:200],
                outcome="denied" if outcome == "denied" else "allowed",
                created_at=datetime.now(UTC),
            )
        )

    def should_record_open(self, ws: MyWorkspace, user_id: UUID) -> bool:
        """In-memory first pass of the throttle, so most workspace loads cost no database work."""
        now = time.monotonic()
        key = (ws.id, user_id)
        if now - _recent_opens.get(key, -1e9) < OPEN_LOG_INTERVAL_MINUTES * 60:
            return False
        _recent_opens[key] = now
        return True

    async def record_open(self, ws: MyWorkspace, user_id: UUID) -> None:
        last = await self.audit_repo.last_open(ws.id, user_id)
        if last is None or datetime.now(UTC) - last > timedelta(minutes=OPEN_LOG_INTERVAL_MINUTES):
            await self.record(ws, user_id, "Opened the workspace", "Workspace")

    async def audit_log(self, ws: MyWorkspace, limit: int = 200) -> list[AuditEntry]:
        return await self.audit_repo.list_for_workspace(ws.id, limit)

    # --- workspace ---------------------------------------------------------------------------
    async def rename(self, ws: MyWorkspace, user_id: UUID, name: str) -> MyWorkspace:
        renamed = await self.workspace_repo.rename(ws.id, name.strip())
        membership_cache.invalidate(ws.id)
        await self.record(ws, user_id, "Renamed the workspace", f"{ws.name} → {renamed.name}")
        return ws.model_copy(update={"name": renamed.name})

    # --- roles -------------------------------------------------------------------------------
    async def roles(self, ws: MyWorkspace) -> list[RolePermissions]:
        overrides = await self.team_repo.get_role_permissions(ws.id)
        used = await self._seats_used(ws.id)
        return [
            RolePermissions(
                role=role,  # type: ignore[arg-type]
                permissions=effective_permissions(role, overrides),
                seats_used=used.get(role, 0),
                seats_total=SEATS_PER_ROLE,
            )
            for role in MEMBER_ROLES
        ]

    async def set_role_permissions(
        self, ws: MyWorkspace, user_id: UUID, role: MemberRole, permissions: list[str]
    ) -> list[RolePermissions]:
        self._owner_only(ws)
        unknown = sorted(set(permissions) - set(PERMISSIONS))
        if unknown:
            raise ValidationError(f"Unknown permissions: {', '.join(unknown)}")
        await self.team_repo.set_role_permissions(
            ws.id, role, [p for p in PERMISSIONS if p in permissions]
        )
        membership_cache.invalidate(ws.id)
        await self.record(ws, user_id, "Changed role permissions", role.replace("_", " "))
        return await self.roles(ws)

    # --- members -----------------------------------------------------------------------------
    async def change_role(
        self, ws: MyWorkspace, user_id: UUID, member_id: UUID, role: MemberRole
    ) -> None:
        self._owner_only(ws)
        member = await self._member(ws, member_id)
        if member.role == role:
            return
        if (await self._seats_left(ws.id)).get(role, 0) <= 0:
            raise ConflictError(f"No {role.replace('_', ' ')} seats left")
        await self.workspace_repo.update_member_role(ws.id, member_id, role)
        membership_cache.invalidate(ws.id)
        await self.record(ws, user_id, "Changed a member's role", role.replace("_", " "))

    async def remove_member(self, ws: MyWorkspace, user_id: UUID, member_id: UUID) -> None:
        self._owner_only(ws)
        await self._member(ws, member_id)
        await self.workspace_repo.remove_member(ws.id, member_id)
        membership_cache.invalidate(ws.id)
        await self.record(ws, user_id, "Removed a member", str(member_id))

    # --- invites -----------------------------------------------------------------------------
    async def invites(self, ws: MyWorkspace) -> list[Invite]:
        return await self.team_repo.list_open_invites(ws.id)

    async def invite(
        self, ws: MyWorkspace, user_id: UUID, email: str, role: MemberRole
    ) -> InviteCreated:
        email = email.strip().lower()
        now = datetime.now(UTC)
        for old in await self.team_repo.list_open_invites(ws.id):
            if (
                old.email == email and old.expires_at < now
            ):  # an expired invite doesn't block a new one
                await self.team_repo.delete_invite(old.id)
        if (await self._seats_left(ws.id)).get(role, 0) <= 0:
            raise ConflictError(f"No {role.replace('_', ' ')} seats left")
        token = new_invite_token()
        try:
            invite = await self.team_repo.create_invite(
                Invite(
                    id=uuid4(),
                    workspace_id=ws.id,
                    email=email,
                    role=role,
                    invited_by=user_id,
                    created_at=now,
                    expires_at=now + timedelta(days=INVITE_TTL_DAYS),
                ),
                hash_invite_token(token),
            )
        except DuplicateError as e:
            raise ConflictError("This email already has an open invitation") from e
        path = f"/invite/{token}"
        emailed = await self._send_invite(ws, email, role, f"{self.app_url}{path}")
        await self.record(ws, user_id, "Invited a member", f"{email} as {role.replace('_', ' ')}")
        return InviteCreated(invite=invite, accept_path=path, emailed=emailed)

    async def revoke_invite(self, ws: MyWorkspace, user_id: UUID, invite_id: UUID) -> None:
        if not any(i.id == invite_id for i in await self.team_repo.list_open_invites(ws.id)):
            raise NotFoundError("Invitation not found")
        await self.team_repo.delete_invite(invite_id)
        await self.record(ws, user_id, "Revoked an invitation", str(invite_id))

    async def preview_invite(self, token: str) -> InvitePreview:
        invite = await self.team_repo.get_invite_by_hash(hash_invite_token(token))
        ws = await self.workspace_repo.get(invite.workspace_id) if invite else None
        if invite is None or ws is None:
            raise NotFoundError("This invitation link is not valid")
        return InvitePreview(
            workspace_name=ws.name,
            role=invite.role,
            email=invite.email,
            expired=invite.expires_at < datetime.now(UTC),
            accepted=invite.accepted_at is not None,
        )

    async def accept_invite(self, token: str, user_id: UUID) -> Workspace:
        invite = await self.team_repo.get_invite_by_hash(hash_invite_token(token))
        ws = await self.workspace_repo.get(invite.workspace_id) if invite else None
        if invite is None or ws is None:
            raise NotFoundError("This invitation link is not valid")
        if invite.accepted_at is not None or invite.expires_at < datetime.now(UTC):
            raise ConflictError("This invitation has already been used or has expired")
        _, email = (await self.user_directory.describe([user_id])).get(user_id, ("", None))
        if (email or "").lower() != invite.email.lower():
            raise PermissionDeniedError(
                f"This invitation is for {invite.email}. Sign in with that email to accept."
            )
        if not await self.team_repo.mark_accepted(invite.id, user_id, datetime.now(UTC)):
            raise ConflictError("This invitation has already been used or has expired")
        if await self.workspace_repo.get_member(ws.id, user_id) is None:
            await self.workspace_repo.add_member(
                WorkspaceMember(
                    workspace_id=ws.id,
                    user_id=user_id,
                    role=invite.role,
                    created_at=datetime.now(UTC),
                )
            )
        mine = await self._mine_for(ws, invite.role)
        await self.record(mine, user_id, "Joined the workspace", invite.role.replace("_", " "))
        return ws

    # --- helpers -----------------------------------------------------------------------------
    async def _mine_for(self, ws: Workspace, role: WorkspaceRole) -> MyWorkspace:
        return MyWorkspace(**ws.model_dump(), role=role)

    @staticmethod
    def _owner_only(ws: MyWorkspace) -> None:
        if ws.role != "owner":
            raise PermissionDeniedError("Only the workspace owner can do this")

    async def _member(self, ws: MyWorkspace, member_id: UUID) -> WorkspaceMember:
        member = await self.workspace_repo.get_member(ws.id, member_id)
        if member is None:
            raise NotFoundError("Member not found")
        if member.role == "owner":
            raise ConflictError("The owner's role can't be changed or removed")
        return member

    async def _seats_used(self, workspace_id: UUID) -> dict[str, int]:
        used = dict.fromkeys(MEMBER_ROLES, 0)
        for m in await self.workspace_repo.list_members(workspace_id):
            if m.role in used:
                used[m.role] += 1
        return used

    async def _seats_left(self, workspace_id: UUID) -> dict[str, int]:
        used = await self._seats_used(workspace_id)
        now = datetime.now(UTC)
        pending = [
            i for i in await self.team_repo.list_open_invites(workspace_id) if i.expires_at > now
        ]
        return {
            role: seats_left(role, used[role], sum(1 for i in pending if i.role == role))
            for role in MEMBER_ROLES
        }

    async def _send_invite(self, ws: MyWorkspace, email: str, role: str, link: str) -> bool:
        if self.email is None:
            return False
        try:
            await self.email.send(
                email,
                f"You're invited to {ws.name} on Creator OS",
                f"You have been invited to join {ws.name} as {role.replace('_', ' ')}. "
                f'<a href="{link}">Accept the invitation</a> (valid for {INVITE_TTL_DAYS} days).',
            )
        except Exception as e:  # noqa: BLE001 — email is best effort; the owner can copy the link
            logger.warning("Invite email to %s failed: %s", email, e)
            return False
        return True
