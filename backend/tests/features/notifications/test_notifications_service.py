from datetime import UTC, datetime, timedelta
from uuid import uuid4

import pytest

from features.account import AccountService
from features.account.models import CategoryPreference, NotificationPreferences
from features.content.models import ContentItemCreate
from features.content.service import ContentService
from features.demo_mode.in_memory_repositories import (
    DemoAccountRepo,
    DemoContentRepo,
    DemoCrmDealRepo,
    DemoNotificationRepo,
    DemoScriptRepo,
    DemoUserDirectory,
    DemoWorkspaceRepo,
)
from features.notifications import NotificationService
from features.workspaces import WorkspaceService
from tests.fakes.fake_repos import FakeCreatorRepo, FakeEmailPort


def _service(email=None):
    accounts = DemoAccountRepo()
    users = DemoUserDirectory()
    repo = DemoNotificationRepo()
    return (
        NotificationService(
            repo, AccountService(accounts, users), users, email, "https://app.example"
        ),
        repo,
        accounts,
    )


@pytest.mark.asyncio
async def test_preferences_decide_inbox_and_email():
    email = FakeEmailPort()
    svc, _repo, accounts = _service(email)
    ws, muted, user = uuid4(), uuid4(), uuid4()
    await accounts.save_preferences(
        muted,
        NotificationPreferences(categories={"task_assignments": CategoryPreference(in_app=False)}),
    )
    sent = await svc.notify(
        ws, [user, muted, user], "task_assignments", "You were assigned “X”", link="/x"
    )
    assert sent == 1 and await svc.unread(ws, user) == 1 and await svc.unread(ws, muted) == 0
    assert email.sent_emails == []  # demo user has no email address


@pytest.mark.asyncio
async def test_deadline_reminders_are_sent_once():
    svc, _repo, _ = _service()
    ws_repo = DemoWorkspaceRepo()
    owner = uuid4()
    ws = await WorkspaceService(ws_repo, FakeCreatorRepo()).ensure_primary_workspace(owner, None)
    content_repo = DemoContentRepo()
    content = ContentService(content_repo, ws_repo, DemoScriptRepo(), DemoCrmDealRepo())
    tomorrow = (datetime.now(UTC) + timedelta(days=1)).date()
    await content.create(
        ws.id, owner, ContentItemCreate(title="Due soon", pillar="p", hook="h", due_date=tomorrow)
    )
    assert await svc.remind_due_tomorrow(content_repo, ws_repo) == 1
    assert await svc.remind_due_tomorrow(content_repo, ws_repo) == 0
    (n,) = await svc.inbox(ws.id, owner)
    assert (
        n.category == "deadlines"
        and "Due soon" in n.title
        and n.link.endswith(f"/kanban?item={n.link.rsplit('=', 1)[1]}")
    )
