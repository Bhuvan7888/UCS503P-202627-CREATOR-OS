"""Supabase implementation of the support ticket repository."""

from typing import Any
from uuid import UUID

from pydantic import TypeAdapter
from supabase import Client

from features.demo_mode import DemoFallbackMixin
from features.support.models import Ticket
from shared.supabase_query import first_or_none, run_query

_to_json = TypeAdapter(dict[str, Any])


class SupabaseTicketRepo(DemoFallbackMixin):
    _fallback_repo_name = "ticket_repo"

    def __init__(self, client: Client):
        self.client = client

    async def create(self, ticket: Ticket) -> Ticket:
        res = await run_query(
            self.client.table("support_tickets").insert(ticket.model_dump(mode="json"))
        )
        return Ticket.model_validate(res.data[0])

    async def get(self, id: UUID) -> Ticket | None:
        res = await run_query(self.client.table("support_tickets").select("*").eq("id", str(id)))
        return first_or_none(Ticket, res)

    async def list_for_user(self, workspace_id: UUID, user_id: UUID, limit: int) -> list[Ticket]:
        res = await run_query(
            self.client.table("support_tickets")
            .select("*")
            .eq("workspace_id", str(workspace_id))
            .eq("user_id", str(user_id))
            .order("created_at", desc=True)
            .limit(limit)
        )
        return [Ticket.model_validate(r) for r in res.data]

    async def update(self, id: UUID, changes: dict[str, Any]) -> Ticket:
        res = await run_query(
            self.client.table("support_tickets")
            .update(_to_json.dump_python(changes, mode="json"))
            .eq("id", str(id))
        )
        return Ticket.model_validate(res.data[0])
