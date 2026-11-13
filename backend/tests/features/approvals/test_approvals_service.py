from uuid import uuid4

import pytest

from features.approvals import ApprovalService
from features.approvals.models import PublishRequestCreate
from features.content import ContentService
from features.content.models import ContentItemCreate
from features.demo_mode.in_memory_repositories import (
    DemoContentRepo,
    DemoCrmDealRepo,
    DemoPublishRequestRepo,
    DemoScriptRepo,
    DemoWorkspaceRepo,
)
from features.workspaces import WorkspaceService
from shared.errors import ConflictError, NotFoundError
from tests.fakes.fake_repos import FakeCreatorRepo


async def _setup():
    ws_repo = DemoWorkspaceRepo()
    owner = uuid4()
    ws = await WorkspaceService(ws_repo, FakeCreatorRepo()).ensure_primary_workspace(owner, None)
    content = ContentService(DemoContentRepo(), ws_repo, DemoScriptRepo(), DemoCrmDealRepo())
    item = await content.create(ws.id, owner, ContentItemCreate(title="t", pillar="p", hook="h"))
    return ApprovalService(DemoPublishRequestRepo(), content), content, ws, owner, item


@pytest.mark.asyncio
async def test_approving_marks_the_item_published_once():
    service, content, ws, owner, item = await _setup()
    req = await service.request(
        ws.id, owner, PublishRequestCreate(content_item_id=item.id, note=" go ")
    )
    assert (req.status, req.note) == ("pending", "go")
    with pytest.raises(ConflictError):  # one pending request per item
        await service.request(ws.id, owner, PublishRequestCreate(content_item_id=item.id))
    approved = await service.approve(ws.id, req.id, owner)
    assert approved.status == "approved" and approved.decided_by == owner and approved.decided_at
    published = await content.get(ws.id, item.id)
    assert published.stage == "published" and published.published_at is not None
    with pytest.raises(ConflictError):  # already decided
        await service.reject(ws.id, req.id, owner, "late")
    with pytest.raises(ConflictError):  # already published
        await service.request(ws.id, owner, PublishRequestCreate(content_item_id=item.id))


@pytest.mark.asyncio
async def test_rejecting_keeps_the_item_and_allows_a_new_request():
    service, content, ws, owner, item = await _setup()
    req = await service.request(ws.id, owner, PublishRequestCreate(content_item_id=item.id))
    rejected = await service.reject(ws.id, req.id, owner, "  Fix the thumbnail ")
    assert (rejected.status, rejected.reason) == ("rejected", "Fix the thumbnail")
    assert (await content.get(ws.id, item.id)).stage == "idea"
    again = await service.request(ws.id, owner, PublishRequestCreate(content_item_id=item.id))
    assert [r.id for r in await service.list(ws.id)] == [again.id, req.id]


@pytest.mark.asyncio
async def test_requests_and_items_of_other_workspaces_are_not_found():
    service, _content, ws, owner, item = await _setup()
    req = await service.request(ws.id, owner, PublishRequestCreate(content_item_id=item.id))
    with pytest.raises(NotFoundError):
        await service.approve(uuid4(), req.id, owner)
    with pytest.raises(NotFoundError):
        await service.request(uuid4(), owner, PublishRequestCreate(content_item_id=item.id))
