from uuid import uuid4

import pytest

from features.content import ContentService
from features.content.models import ContentItemCreate, ContentItemUpdate
from features.demo_mode.in_memory_repositories import DemoContentRepo, DemoWorkspaceRepo
from features.workspaces import WorkspaceService
from shared.errors import NotFoundError, ValidationError
from tests.fakes.fake_repos import FakeCreatorRepo

NEW = ContentItemCreate(title="Morning routine", pillar="Lifestyle", hook="I tried 5am for 30 days")


async def _setup():
    ws_repo = DemoWorkspaceRepo()
    owner = uuid4()
    ws = await WorkspaceService(ws_repo, FakeCreatorRepo()).ensure_primary_workspace(owner, None)
    return ContentService(DemoContentRepo(), ws_repo), ws, owner


@pytest.mark.asyncio
async def test_create_starts_as_an_idea_and_moves_through_stages():
    service, ws, owner = await _setup()
    item = await service.create(ws.id, owner, NEW.model_copy(update={"assignee_user_id": owner}))
    assert (item.stage, item.created_by, item.assignee_user_id) == ("idea", owner, owner)
    moved = await service.update(ws.id, item.id, ContentItemUpdate(stage="scripted"))
    assert (
        moved.stage == "scripted"
        and moved.title == NEW.title
        and moved.updated_at >= item.updated_at
    )


@pytest.mark.asyncio
async def test_assignee_must_be_a_workspace_member():
    service, ws, owner = await _setup()
    with pytest.raises(ValidationError):
        await service.create(ws.id, owner, NEW.model_copy(update={"assignee_user_id": uuid4()}))


@pytest.mark.asyncio
async def test_items_from_another_workspace_are_not_found_and_required_fields_cannot_be_cleared():
    service, ws, owner = await _setup()
    item = await service.create(ws.id, owner, NEW)
    with pytest.raises(NotFoundError):
        await service.update(uuid4(), item.id, ContentItemUpdate(stage="published"))
    with pytest.raises(ValidationError):
        await service.update(ws.id, item.id, ContentItemUpdate.model_validate({"title": None}))
