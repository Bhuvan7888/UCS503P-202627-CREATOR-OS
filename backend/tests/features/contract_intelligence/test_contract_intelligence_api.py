from datetime import UTC, datetime
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from features.auth.dependencies import ActorContext, get_current_brand
from features.contract_intelligence import (
    ClauseCardOut,
    ClauseExplanationService,
    ContractIntelligenceService,
)
from features.contract_intelligence.dependencies import (
    get_contract_intelligence_service,
)
from features.contracts import Contract
from main import app
from tests.fakes.fake_repos import (
    FakeClauseCardRepo,
    FakeContractRepo,
    FakeEmailPort,
    FakeEscalationRepo,
    FakeLLMPort,
)

client = TestClient(app)

@pytest.fixture
def fake_ci_service():
    contract_repo = FakeContractRepo()
    clause_card_repo = FakeClauseCardRepo()
    escalation_repo = FakeEscalationRepo()
    email_port = FakeEmailPort()
    llm_port = FakeLLMPort(explanation="LLM explanation output.")
    clause_explanation_service = ClauseExplanationService(llm_port, clause_card_repo)
    
    # Seed data
    contract_id = uuid4()
    contract = Contract(
        id=contract_id,
        deal_id=uuid4(),
        status="uploaded",
        previous_status=None,
        s3_path=None,
        usage_rights_duration_days=None,
        exclusivity_scope=None,
        revision_limit=None,
        payment_timeline_days=None,
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC)
    )
    contract_repo.data[contract_id] = contract

    card_id = uuid4()
    card = ClauseCardOut(
        id=card_id,
        contract_id=contract_id,
        clause_type="usage_rights",
        raw_text="The brand gets perpetual usage rights.",
        flag="red",
        flag_reason_code="perpetual_usage_rights",
        llm_explanation=None,
        created_at=datetime.now(UTC)
    )
    clause_card_repo.data[card_id] = card

    service = ContractIntelligenceService(
        clause_card_repo, 
        escalation_repo, 
        contract_repo,
        email_port,
        clause_explanation_service
    )
    return service, contract_id, card_id, email_port

@pytest.mark.asyncio
async def test_escalation_lifecycle(fake_ci_service):
    service, contract_id, card_id, email_port = fake_ci_service

    app.dependency_overrides[get_contract_intelligence_service] = lambda: service
    app.dependency_overrides[get_current_brand] = lambda: ActorContext(
        user_id=uuid4(), actor_type="brand", brand_id=uuid4()
    )

    # 1. Get clauses
    res = client.get(f"/contracts/{contract_id}/clauses")
    assert res.status_code == 200
    clauses = res.json()
    assert len(clauses) == 1
    assert clauses[0]["flag"] == "red"
    assert clauses[0]["llm_explanation"] is None

    # 2. Escalate clause
    res = client.post(f"/contracts/{contract_id}/escalate", json={
        "clause_card_id": str(card_id),
        "reason_code": "perpetual_usage_rights"
    })
    assert res.status_code == 200
    escalation = res.json()
    escalation_id = escalation["id"]
    assert escalation["status"] == "open"
    
    # Verify contract status changed to pending_review and previous_status is uploaded
    contract = service.contract_repo.data[contract_id]
    assert contract.status == "pending_review"
    assert contract.previous_status == "uploaded"

    # Verify LLM Explanation was added
    card = service.clause_card_repo.data[card_id]
    assert card.llm_explanation == "LLM explanation output."

    # Verify Email was sent
    assert len(email_port.sent_emails) == 1
    assert email_port.sent_emails[0]["to"] == "compliance@creatoros.com"

    # 3. Resolve escalation (cleared)
    res = client.post(f"/escalations/{escalation_id}/resolve", json={
        "decision": "cleared",
        "note": "Discussed with brand, they agree to 30 days."
    })
    assert res.status_code == 200
    resolved = res.json()
    assert resolved["status"] == "cleared"
    assert resolved["resolution_note"] == "Discussed with brand, they agree to 30 days."

    # Verify contract reverted to uploaded
    contract = service.contract_repo.data[contract_id]
    assert contract.status == "uploaded"

    app.dependency_overrides.clear()
