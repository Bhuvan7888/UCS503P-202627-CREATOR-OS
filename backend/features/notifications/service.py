import logging
from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4

from features.account import AccountService, Category, category_preference, may_email
from features.content import ContentRepo
from features.notifications.models import Notification
from features.notifications.repository import NotificationRepo
from features.workspaces import UserDirectory, WorkspaceRepo
from shared.email.email_port import EmailPort
from shared.errors import NotFoundError

logger = logging.getLogger(__name__)
INBOX_SIZE = 100
MAX_REMINDERS_PER_SWEEP = 500


class NotificationService:
    """Creates notifications from workspace events, honouring each person's preferences."""

    def __init__(
        self,
        repo: NotificationRepo,
        account: AccountService,
        users: UserDirectory,
        email: EmailPort | None,
        app_url: str,
    ):
        self.repo = repo
        self.account = account
        self.users = users
        self.email = email
        self.app_url = app_url.rstrip("/")

    async def notify(
        self,
        workspace_id: UUID,
        user_ids: list[UUID],
        category: Category,
        title: str,
        body: str = "",
        link: str = "",
        priority: str = "normal",
        dedupe_key: str | None = None,
    ) -> int:
        """Inbox entry for each recipient whose preferences allow it, plus an email when allowed. Returns how many."""
        sent = 0
        now = datetime.now(UTC)
        for user_id in dict.fromkeys(user_ids):
            prefs = await self.account.preferences(user_id)
            if not category_preference(prefs, category).in_app:
                continue
            created = await self.repo.add(
                Notification(
                    id=uuid4(),
                    workspace_id=workspace_id,
                    user_id=user_id,
                    category=category,
                    priority="high" if priority == "high" else "normal",
                    title=title[:200],
                    body=body[:1000],
                    link=link,
                    dedupe_key=dedupe_key,
                    created_at=now,
                )
            )
            if not created:
                continue
            sent += 1
            if self.email and may_email(prefs, category, now, await self.account.timezone(user_id)):
                await self._email(user_id, title, body, link)
        return sent

    async def _email(self, user_id: UUID, title: str, body: str, link: str) -> None:
        _, address = (await self.users.describe([user_id])).get(user_id, ("", None))
        if not address or self.email is None:
            return
        try:
            await self.email.send(
                address, title, f'{body}<br><a href="{self.app_url}{link}">Open in Creator OS</a>'
            )
        except Exception as e:  # noqa: BLE001 — email is best effort; the inbox entry exists
            logger.warning("Notification email to %s failed: %s", address, e)

    async def inbox(
        self, workspace_id: UUID, user_id: UUID, archived: bool = False
    ) -> list[Notification]:
        return await self.repo.list_for_user(workspace_id, user_id, archived, INBOX_SIZE)

    async def unread(self, workspace_id: UUID, user_id: UUID) -> int:
        return await self.repo.unread_count(workspace_id, user_id)

    async def mark_read(self, workspace_id: UUID, user_id: UUID, ids: list[UUID] | None) -> None:
        await self.repo.mark_read(workspace_id, user_id, ids, datetime.now(UTC))

    async def archive(self, workspace_id: UUID, user_id: UUID, notification_id: UUID) -> None:
        if not await self.repo.archive(workspace_id, user_id, notification_id, datetime.now(UTC)):
            raise NotFoundError("Notification not found")

    async def remind_due_tomorrow(self, content: ContentRepo, workspaces: WorkspaceRepo) -> int:
        """Daily sweep: one reminder per item due tomorrow (to its assignee, else the owner). Safe to rerun."""
        tomorrow = (datetime.now(UTC) + timedelta(days=1)).date()
        sent = 0
        for item in await content.list_due_on(tomorrow, MAX_REMINDERS_PER_SWEEP):
            ws = await workspaces.get(item.workspace_id)
            if ws is None:
                continue
            sent += await self.notify(
                ws.id,
                [item.assignee_user_id or ws.owner_user_id],
                "deadlines",
                f"“{item.title}” is due tomorrow",
                f"Stage: {item.stage.replace('_', ' ')}.",
                f"/dashboard/{ws.slug}/kanban?item={item.id}",
                dedupe_key=f"due:{item.id}:{tomorrow.isoformat()}",
            )
        return sent
