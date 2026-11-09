from datetime import UTC, datetime
from uuid import uuid4

import pytest

from features.contract_intelligence import (
    ClauseCardOut,
    ClauseExplanationService,
    ClauseInput,
    ContractIntelligenceService,
    EscalateRequest,
)
from features.contracts import Contract
from tests.fakes.fake_repos import (
    FakeClauseCardRepo,
    FakeContractRepo,
    FakeEmailPort,
    FakeEscalationRepo,
    FakeLLMPort,
)


@pytest.mark.asyncio
async def test_escalate_clause_sends_email():
    email_port = FakeEmailPort()
    contract_repo = FakeContractRepo()
    clause_repo = FakeClauseCardRepo()
    escalation_repo = FakeEscalationRepo()
    llm_port = FakeLLMPort()
    clause_explanation_service = ClauseExplanationService(llm_port, clause_repo)

    service = ContractIntelligenceService(
        clause_repo, escalation_repo, contract_repo, email_port, clause_explanation_service
    )

    contract_id = uuid4()
    contract_repo.data[contract_id] = Contract(
        id=contract_id,
        deal_id=uuid4(),
        status="uploaded",
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )

    card_id = uuid4()
    card = ClauseCardOut(
        id=card_id,
        contract_id=contract_id,
        clause_type="usage_rights",
        raw_text="perpetual usage rights",
        flag="red",
        flag_reason_code="perpetual_usage_rights",
        created_at=datetime.now(UTC),
    )
    await clause_repo.create(card)

    req = EscalateRequest(clause_card_id=card_id, reason_code="perpetual_usage_rights")

    escalation = await service.escalate_clause(contract_id, req)

    assert escalation.status == "open"
    assert len(email_port.sent_emails) == 1
    assert email_port.sent_emails[0]["to"] == "compliance@creatoros.com"
    assert "Action Required" in email_port.sent_emails[0]["subject"]


@pytest.mark.asyncio
async def test_scan_contract_flags_red_clause_and_locks_review():
    contract_repo = FakeContractRepo()
    clause_repo = FakeClauseCardRepo()
    escalation_repo = FakeEscalationRepo()
    email_port = FakeEmailPort()
    llm_port = FakeLLMPort()
    clause_explanation_service = ClauseExplanationService(llm_port, clause_repo)

    service = ContractIntelligenceService(
        clause_repo, escalation_repo, contract_repo, email_port, clause_explanation_service
    )

    contract_id = uuid4()
    contract_repo.data[contract_id] = Contract(
        id=contract_id,
        deal_id=uuid4(),
        status="uploaded",
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )

    cards = await service.scan_contract(
        contract_id,
        [
            ClauseInput(
                clause_type="usage_rights",
                raw_text="This grants perpetual usage rights to the brand.",
            ),
            ClauseInput(clause_type="payment", raw_text="Payment due within 15 days of delivery."),
        ],
    )

    assert len(cards) == 2
    assert cards[0].flag == "red"
    assert cards[0].flag_reason_code == "perpetual_usage_rights"
    assert cards[1].flag == "green"

    updated_contract = await contract_repo.get(contract_id)
    assert updated_contract.status == "pending_review"
    assert updated_contract.previous_status == "uploaded"


@pytest.mark.asyncio
async def test_scan_contract_no_red_flags_leaves_status_unchanged():
    contract_repo = FakeContractRepo()
    clause_repo = FakeClauseCardRepo()
    escalation_repo = FakeEscalationRepo()
    email_port = FakeEmailPort()
    llm_port = FakeLLMPort()
    clause_explanation_service = ClauseExplanationService(llm_port, clause_repo)

    service = ContractIntelligenceService(
        clause_repo, escalation_repo, contract_repo, email_port, clause_explanation_service
    )

    contract_id = uuid4()
    contract_repo.data[contract_id] = Contract(
        id=contract_id,
        deal_id=uuid4(),
        status="uploaded",
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )

    await service.scan_contract(
        contract_id,
        [
            ClauseInput(clause_type="payment", raw_text="Payment due within 15 days of delivery."),
        ],
    )

    updated_contract = await contract_repo.get(contract_id)
    assert updated_contract.status == "uploaded"
