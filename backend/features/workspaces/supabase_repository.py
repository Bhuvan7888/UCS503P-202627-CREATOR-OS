"""Supabase implementation of the workspaces repository."""

import asyncio
from datetime import UTC, datetime
from uuid import UUID

from postgrest.exceptions import APIError
from postgrest.types import CountMethod
from supabase import Client

from features.demo_mode import DemoFallbackMixin
from features.workspaces.models import AuditEntry, Invite, Workspace, WorkspaceMember, WorkspaceRole
from shared.errors import DuplicateError
from shared.supabase_query import first_or_none, run_query

_UNIQUE_VIOLATION = "23505"


class SupabaseWorkspaceRepo(DemoFallbackMixin):
    _fallback_repo_name = "workspace_repo"

    def __init__(self, client: Client):
        self.client = client

    async def create(self, workspace: Workspace) -> Workspace:
        try:
            res = await run_query(
                self.client.table("workspaces").insert(workspace.model_dump(mode="json"))
            )
        except APIError as e:
            if e.code == _UNIQUE_VIOLATION:
                raise DuplicateError("Workspace already exists") from e
            raise
        return Workspace.model_validate(res.data[0])

    async def get(self, id: UUID) -> Workspace | None:
        res = await run_query(self.client.table("workspaces").select("*").eq("id", str(id)))
        return first_or_none(Workspace, res)

    async def get_by_slug(self, slug: str) -> Workspace | None:
        res = await run_query(self.client.table("workspaces").select("*").eq("slug", slug))
        return first_or_none(Workspace, res)

    async def get_primary_for_owner(self, owner_user_id: UUID) -> Workspace | None:
        res = await run_query(
            self.client.table("workspaces")
            .select("*")
            .eq("owner_user_id", str(owner_user_id))
            .eq("is_primary", True)
        )
        return first_or_none(Workspace, res)

    async def count_owned(self, owner_user_id: UUID) -> int:
        res = await run_query(
            self.client.table("workspaces")
            .select("id", count=CountMethod.exact)
            .eq("owner_user_id", str(owner_user_id))
        )
        return res.count or 0

    async def add_member(self, member: WorkspaceMember) -> WorkspaceMember:
        res = await run_query(
            self.client.table("workspace_members").insert(member.model_dump(mode="json"))
        )
        return WorkspaceMember.model_validate(res.data[0])

    async def get_member(self, workspace_id: UUID, user_id: UUID) -> WorkspaceMember | None:
        res = await run_query(
            self.client.table("workspace_members")
            .select("*")
            .eq("workspace_id", str(workspace_id))
            .eq("user_id", str(user_id))
        )
        return first_or_none(WorkspaceMember, res)

    async def list_for_user(self, user_id: UUID) -> list[tuple[Workspace, WorkspaceRole]]:
        res = await run_query(
            self.client.table("workspace_members")
            .select("role, workspaces(*)")
            .eq("user_id", str(user_id))
            .order("created_at")
        )
        return [(Workspace.model_validate(row["workspaces"]), row["role"]) for row in res.data]

    async def list_members(self, workspace_id: UUID) -> list[WorkspaceMember]:
        res = await run_query(
            self.client.table("workspace_members")
            .select("*")
            .eq("workspace_id", str(workspace_id))
            .order("created_at")
        )
        return [WorkspaceMember.model_validate(row) for row in res.data]

    async def rename(self, id: UUID, name: str) -> Workspace:
        res = await run_query(
            self.client.table("workspaces")
            .update({"name": name, "updated_at": datetime.now(UTC).isoformat()})
            .eq("id", str(id))
        )
        return Workspace.model_validate(res.data[0])

    async def update_member_role(
        self, workspace_id: UUID, user_id: UUID, role: WorkspaceRole
    ) -> WorkspaceMember:
        res = await run_query(
            self.client.table("workspace_members")
            .update({"role": role})
            .eq("workspace_id", str(workspace_id))
            .eq("user_id", str(user_id))
        )
        return WorkspaceMember.model_validate(res.data[0])

    async def remove_member(self, workspace_id: UUID, user_id: UUID) -> None:
        await run_query(
            self.client.table("workspace_members")
            .delete()
            .eq("workspace_id", str(workspace_id))
            .eq("user_id", str(user_id))
        )


class SupabaseTeamRepo(DemoFallbackMixin):
    _fallback_repo_name = "team_repo"

    def __init__(self, client: Client):
        self.client = client

    async def create_invite(self, invite: Invite, token_hash: str) -> Invite:
        try:
            res = await run_query(
                self.client.table("workspace_invites").insert(
                    {**invite.model_dump(mode="json"), "token_hash": token_hash}
                )
            )
        except APIError as e:
            if e.code == _UNIQUE_VIOLATION:
                raise DuplicateError("An open invitation already exists") from e
            raise
        return Invite.model_validate(res.data[0])

    async def get_invite_by_hash(self, token_hash: str) -> Invite | None:
        res = await run_query(
            self.client.table("workspace_invites").select("*").eq("token_hash", token_hash)
        )
        return first_or_none(Invite, res)

    async def list_open_invites(self, workspace_id: UUID) -> list[Invite]:
        res = await run_query(
            self.client.table("workspace_invites")
            .select("*")
            .eq("workspace_id", str(workspace_id))
            .is_("accepted_at", "null")
            .order("created_at")
        )
        return [Invite.model_validate(row) for row in res.data]

    async def mark_accepted(self, invite_id: UUID, user_id: UUID, at: datetime) -> bool:
        res = await run_query(
            self.client.table("workspace_invites")
            .update({"accepted_at": at.isoformat(), "accepted_by": str(user_id)})
            .eq("id", str(invite_id))
            .is_("accepted_at", "null")
        )
        return bool(res.data)

    async def delete_invite(self, invite_id: UUID) -> None:
        await run_query(self.client.table("workspace_invites").delete().eq("id", str(invite_id)))

    async def get_role_permissions(self, workspace_id: UUID) -> dict[str, list[str]]:
        res = await run_query(
            self.client.table("workspace_role_permissions")
            .select("role, permissions")
            .eq("workspace_id", str(workspace_id))
        )
        return {row["role"]: row["permissions"] for row in res.data}

    async def set_role_permissions(
        self, workspace_id: UUID, role: str, permissions: list[str]
    ) -> None:
        await run_query(
            self.client.table("workspace_role_permissions").upsert(
                {
                    "workspace_id": str(workspace_id),
                    "role": role,
                    "permissions": permissions,
                    "updated_at": datetime.now(UTC).isoformat(),
                }
            )
        )


class SupabaseAuditRepo(DemoFallbackMixin):
    _fallback_repo_name = "audit_repo"

    def __init__(self, client: Client):
        self.client = client

    async def add(self, entry: AuditEntry) -> None:
        await run_query(self.client.table("audit_log").insert(entry.model_dump(mode="json")))

    async def list_for_workspace(self, workspace_id: UUID, limit: int) -> list[AuditEntry]:
        res = await run_query(
            self.client.table("audit_log")
            .select("*")
            .eq("workspace_id", str(workspace_id))
            .order("created_at", desc=True)
            .limit(limit)
        )
        return [AuditEntry.model_validate(row) for row in res.data]

    async def last_open(self, workspace_id: UUID, user_id: UUID) -> datetime | None:
        res = await run_query(
            self.client.table("audit_log")
            .select("created_at")
            .eq("workspace_id", str(workspace_id))
            .eq("actor_user_id", str(user_id))
            .eq("action", "Opened the workspace")
            .order("created_at", desc=True)
            .limit(1)
        )
        return datetime.fromisoformat(res.data[0]["created_at"]) if res.data else None


class SupabaseUserDirectory(DemoFallbackMixin):
    _fallback_repo_name = "user_directory"

    def __init__(self, client: Client):
        self.client = client

    async def describe(self, user_ids: list[UUID]) -> dict[UUID, tuple[str, str | None]]:
        users = await asyncio.gather(
            *(asyncio.to_thread(self.client.auth.admin.get_user_by_id, str(u)) for u in user_ids)
        )
        out: dict[UUID, tuple[str, str | None]] = {}
        for uid, res in zip(user_ids, users, strict=True):
            meta = res.user.user_metadata or {}
            email = res.user.email
            name = (
                meta.get("full_name")
                or meta.get("name")
                or (email.split("@")[0] if email else "Member")
            )
            out[uid] = (name, email)
        return out
