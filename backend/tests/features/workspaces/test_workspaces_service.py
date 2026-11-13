import asyncio
import re
from uuid import uuid4

import pytest

from features.demo_mode.in_memory_repositories import DemoWorkspaceRepo
from features.workspaces import MAX_WORKSPACES_PER_OWNER, WorkspaceService, parse_workspace_ref
from shared.errors import NotFoundError, PermissionDeniedError, ValidationError
from tests.fakes.fake_repos import FakeCreatorRepo


class _InterleavingRepo(DemoWorkspaceRepo):
    """Yields inside the lookup so two first requests really interleave (the race we guard)."""

    async def get_primary_for_owner(self, owner_user_id):
        await asyncio.sleep(0)
        return await super().get_primary_for_owner(owner_user_id)


def _service(repo=None):
    return WorkspaceService(repo or DemoWorkspaceRepo(), FakeCreatorRepo())


def test_slug_or_id_reference():
    ws_id = uuid4()
    assert parse_workspace_ref(str(ws_id)) == ws_id
    assert parse_workspace_ref("ws-d45f69f0") is None


@pytest.mark.asyncio
async def test_primary_workspace_is_created_once_with_owner_membership():
    service, owner, creator = _service(), uuid4(), uuid4()
    first = await service.ensure_primary_workspace(owner, creator)
    again = await service.ensure_primary_workspace(owner, creator)
    assert first.id == again.id
    assert first.name == "My Workspace"
    assert (
        "plan" not in first.model_dump() and "trial_ends_at" not in first.model_dump()
    )  # free for everyone
    assert re.fullmatch(r"ws-[0-9a-f]{8}", first.slug)
    mine = await service.workspace_repo.list_for_user(owner)
    assert [(w.id, role) for w, role in mine] == [(first.id, "owner")]


@pytest.mark.asyncio
async def test_concurrent_first_requests_create_exactly_one_primary_workspace():
    repo, owner, creator = _InterleavingRepo(), uuid4(), uuid4()
    service = _service(repo)
    results = await asyncio.gather(
        *(service.ensure_primary_workspace(owner, creator) for _ in range(5))
    )
    assert len({w.id for w in results}) == 1
    assert await repo.count_owned(owner) == 1


@pytest.mark.asyncio
async def test_fair_use_workspace_cap():
    service, owner = _service(), uuid4()
    await service.ensure_primary_workspace(owner, uuid4())
    for i in range(MAX_WORKSPACES_PER_OWNER - 1):
        await service.create_workspace(owner, f"Extra {i}")
    with pytest.raises(ValidationError):
        await service.create_workspace(owner, "One too many")


@pytest.mark.asyncio
async def test_membership_is_required_and_unknown_workspaces_are_not_found():
    service, owner, stranger = _service(), uuid4(), uuid4()
    ws = await service.ensure_primary_workspace(owner, uuid4())
    assert (await service.get_for_member(ws.slug, owner)).role == "owner"
    assert (await service.get_for_member(str(ws.id), owner)).id == ws.id
    with pytest.raises(PermissionDeniedError):
        await service.get_for_member(ws.slug, stranger)
    with pytest.raises(NotFoundError):
        await service.get_for_member("ws-00000000", owner)
