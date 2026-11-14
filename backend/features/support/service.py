import logging
from datetime import UTC, datetime
from uuid import UUID, uuid4

from features.support.models import Ticket, TicketCreate
from features.support.repository import TicketRepo
from shared.email.email_port import EmailPort
from shared.errors import ConflictError, NotFoundError

logger = logging.getLogger(__name__)
MAX_TICKETS_LISTED = 200


class SupportService:
    """Help tickets: each person sees their own tickets in a workspace; the support inbox gets an email."""

    def __init__(self, repo: TicketRepo, email: EmailPort | None, support_address: str):
        self.repo = repo
        self.email = email
        self.support_address = support_address

    async def list(self, workspace_id: UUID, user_id: UUID) -> list[Ticket]:
        return await self.repo.list_for_user(workspace_id, user_id, MAX_TICKETS_LISTED)

    async def create(
        self,
        workspace_id: UUID,
        workspace_name: str,
        user_id: UUID,
        user_label: str,
        request: TicketCreate,
    ) -> Ticket:
        now = datetime.now(UTC)
        ticket = await self.repo.create(
            Ticket(
                id=uuid4(),
                workspace_id=workspace_id,
                user_id=user_id,
                created_at=now,
                updated_at=now,
                **request.model_dump(),
            )
        )
        if self.email and self.support_address:
            try:
                await self.email.send(
                    self.support_address,
                    f"[{request.priority}] {request.subject}",
                    f"From {user_label} in {workspace_name} ({request.category.replace('_', ' ')}):<br>{request.description}",
                )
            except Exception as e:  # noqa: BLE001 — the ticket is saved either way
                logger.warning("Support email failed: %s", e)
        return ticket

    async def close(self, workspace_id: UUID, user_id: UUID, ticket_id: UUID) -> Ticket:
        ticket = await self.repo.get(ticket_id)
        if ticket is None or ticket.workspace_id != workspace_id or ticket.user_id != user_id:
            raise NotFoundError("Ticket not found")
        if ticket.status == "closed":
            raise ConflictError("This ticket is already closed")
        return await self.repo.update(
            ticket_id, {"status": "closed", "updated_at": datetime.now(UTC)}
        )
