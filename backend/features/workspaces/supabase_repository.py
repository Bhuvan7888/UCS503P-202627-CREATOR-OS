"""Supabase implementation of the workspaces repository."""

from uuid import UUID

from postgrest.exceptions import APIError
from postgrest.types import CountMethod
from supabase import Client

from features.demo_mode import DemoFallbackMixin
from features.workspaces.models import Workspace, WorkspaceMember, WorkspaceRole
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
