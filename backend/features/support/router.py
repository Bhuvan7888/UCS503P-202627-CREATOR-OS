from uuid import UUID

from fastapi import APIRouter, Depends

from features.demo_mode import is_demo_mode
from features.support.models import Ticket, TicketCreate
from features.support.service import SupportService
from features.support.supabase_repository import SupabaseTicketRepo
from features.workspaces.dependencies import WorkspaceContext, get_team_service, require_person
from features.workspaces.service import TeamService
from shared.config import settings
from shared.email.resend_adapter import ResendAdapter
from shared.errors import ConflictError, NotFoundError
from shared.http_errors import map_errors
from shared.supabase_client import get_supabase_client

router = APIRouter(prefix="/workspaces/{workspace}/support/tickets", tags=["support"])


def get_support_service() -> SupportService:
    key = settings.TRANSACTIONAL_EMAIL_API_KEY
    email = None if is_demo_mode() or not key or "dummy" in key.lower() else ResendAdapter()
    return SupportService(
        SupabaseTicketRepo(get_supabase_client(service_role=True)), email, settings.SUPPORT_EMAIL
    )


@router.get("", response_model=list[Ticket])
async def my_tickets(
    ctx: WorkspaceContext = Depends(require_person),
    svc: SupportService = Depends(get_support_service),
):
    return await svc.list(ctx.workspace.id, ctx.user_id)


@router.post("", response_model=Ticket, status_code=201)
async def create_ticket(
    request: TicketCreate,
    ctx: WorkspaceContext = Depends(require_person),
    svc: SupportService = Depends(get_support_service),
    team: TeamService = Depends(get_team_service),
):
    name, email = (await team.user_directory.describe([ctx.user_id])).get(
        ctx.user_id, ("Member", None)
    )
    label = f"{name} <{email}>" if email else name
    return await svc.create(ctx.workspace.id, ctx.workspace.name, ctx.user_id, label, request)


@router.post("/{ticket_id}/close", response_model=Ticket)
async def close_ticket(
    ticket_id: UUID,
    ctx: WorkspaceContext = Depends(require_person),
    svc: SupportService = Depends(get_support_service),
):
    with map_errors({NotFoundError: 404, ConflictError: 409}):
        return await svc.close(ctx.workspace.id, ctx.user_id, ticket_id)
