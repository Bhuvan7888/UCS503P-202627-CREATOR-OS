from datetime import UTC, datetime
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from features.auth.dependencies import ActorContext, get_current_actor
from features.benchmarks import BenchmarkService
from features.benchmarks.router import router as benchmarks_router
from features.deals import Deal
from features.negotiation import ChecklistState, NegotiationService, NegotiationSession
from features.negotiation.router import router as negotiation_router
from tests.fakes.access import use_fake_access_repos
from tests.fakes.fake_repos import FakeDealRepo, FakeLLMPort, FakeRateBenchmarkRepo

CREATOR = ActorContext(user_id=uuid4(), actor_type="creator", brand_id=uuid4(), creator_id=uuid4())


def _creators_deal(monkeypatch):
    """A deal owned by CREATOR, visible to the routers' access checks."""
    now = datetime.now(UTC)
    deal = Deal(
        id=uuid4(),
        brand_id=None,
        creator_id=CREATOR.creator_id,
        campaign_name="c",
        contact_email="a@b.c",
        status="negotiating",
        created_at=now,
        updated_at=now,
    )
    repo = FakeDealRepo()
    repo.data[deal.id] = deal
    use_fake_access_repos(monkeypatch, deal_repo=repo)
    return deal.id


# Mock FastAPI dependencies
def get_mock_benchmark_service_factory(repo):
    def _get():
        return BenchmarkService(repo)

    return _get


def get_mock_negotiation_service_factory(service):
    def _get():
        return service

    return _get


@pytest.fixture
def benchmark_client():
    from fastapi import FastAPI

    app = FastAPI()
    app.include_router(benchmarks_router)
    app.dependency_overrides[get_current_actor] = lambda: CREATOR
    return app


@pytest.fixture
def negotiation_client():
    from fastapi import FastAPI

    app = FastAPI()
    app.include_router(negotiation_router)
    app.dependency_overrides[get_current_actor] = lambda: CREATOR
    return app


def test_benchmark_insufficient_data(benchmark_client):
    from features.benchmarks.router import get_benchmark_service

    repo = FakeRateBenchmarkRepo(
        data={
            ("beauty", "micro"): [100.0, 150.0, 200.0]  # only 3 data points
        }
    )
    benchmark_client.dependency_overrides[get_benchmark_service] = (
        get_mock_benchmark_service_factory(repo)
    )

    with TestClient(benchmark_client) as client:
        res = client.get("/benchmarks?niche=beauty&follower_tier=micro")
        assert res.status_code == 200
        data = res.json()
        assert data["insufficient_data"] is True
        assert data["p50_rate"] is None


def test_benchmark_sufficient_data(benchmark_client):
    from features.benchmarks.router import get_benchmark_service

    repo = FakeRateBenchmarkRepo(
        data={
            ("beauty", "micro"): [100.0, 150.0, 200.0, 250.0, 300.0]  # 5 data points
        }
    )
    benchmark_client.dependency_overrides[get_benchmark_service] = (
        get_mock_benchmark_service_factory(repo)
    )

    with TestClient(benchmark_client) as client:
        res = client.get("/benchmarks?niche=beauty&follower_tier=micro")
        assert res.status_code == 200
        data = res.json()
        assert data["insufficient_data"] is False
        assert data["p50_rate"] == 200.0


class MinimalFakeSessionRepo:
    def __init__(self, session: NegotiationSession):
        self.session = session

    async def get(self, id):
        return self.session


class MinimalFakeActivityLogRepo:
    pass


def test_negotiation_script_fails_checklist(negotiation_client, monkeypatch):
    from features.negotiation.router import get_negotiation_service

    session = NegotiationSession(
        id=uuid4(),
        deal_id=_creators_deal(monkeypatch),
        status="active",
        views_per_week=10000,
        niche_cpm=50.0,
        follower_tier_multiplier=1.0,
        engagement_rate_adjustment=0.0,
        base_rate=500.0,
        range_low=425.0,
        range_high=675.0,
        checklist=ChecklistState(usage_rights_duration_set=False),
        created_at=datetime.now(UTC),
    )
    repo = MinimalFakeSessionRepo(session)
    service = NegotiationService(repo, MinimalFakeActivityLogRepo(), llm_port=FakeLLMPort())  # type: ignore

    negotiation_client.dependency_overrides[get_negotiation_service] = (
        get_mock_negotiation_service_factory(service)
    )

    with TestClient(negotiation_client) as client:
        res = client.post(
            f"/negotiation/sessions/{session.id}/script",
            json={"session_id": str(session.id), "kind": "lowball_opener", "use_llm": True},
        )
        assert res.status_code == 409
        assert "Checklist is not complete" in res.json()["detail"]


def test_negotiation_script_success(negotiation_client, monkeypatch):
    from features.negotiation.router import get_negotiation_service

    session = NegotiationSession(
        id=uuid4(),
        deal_id=_creators_deal(monkeypatch),
        status="active",
        views_per_week=10000,
        niche_cpm=50.0,
        follower_tier_multiplier=1.0,
        engagement_rate_adjustment=0.0,
        base_rate=500.0,
        range_low=425.0,
        range_high=675.0,
        checklist=ChecklistState(
            usage_rights_duration_set=True,
            exclusivity_scope_set=True,
            revision_limit_set=True,
            payment_timeline_set=True,
        ),
        created_at=datetime.now(UTC),
    )
    repo = MinimalFakeSessionRepo(session)
    service = NegotiationService(
        repo, MinimalFakeActivityLogRepo(), llm_port=FakeLLMPort(explanation="Drafted LLM script")
    )  # type: ignore

    negotiation_client.dependency_overrides[get_negotiation_service] = (
        get_mock_negotiation_service_factory(service)
    )

    with TestClient(negotiation_client) as client:
        res = client.post(
            f"/negotiation/sessions/{session.id}/script",
            json={"session_id": str(session.id), "kind": "lowball_opener", "use_llm": True},
        )
        assert res.status_code == 200
        assert res.json() == "Drafted LLM script"
