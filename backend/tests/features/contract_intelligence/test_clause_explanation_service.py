from datetime import UTC, datetime
from uuid import uuid4

import pytest

from features.contract_intelligence import ClauseCardOut, ClauseExplanationService
from features.contract_intelligence.clause_explanation_service import (
    DEFAULT_FLAG_EXPLANATIONS,
)
from tests.fakes.fake_repos import FakeClauseCardRepo, FakeLLMPort


@pytest.mark.asyncio
async def test_clause_explanation_success():
    llm = FakeLLMPort(should_fail=False, explanation="This means you give up rights forever.")
    repo = FakeClauseCardRepo()
    service = ClauseExplanationService(llm, repo)

    contract_id = uuid4()
    card = ClauseCardOut(
        id=uuid4(),
        contract_id=contract_id,
        clause_type="usage_rights",
        raw_text="You grant us perpetual usage rights.",
        flag="red",
        flag_reason_code="perpetual_usage_rights",
        created_at=datetime.now(UTC)
    )
    
    updated_card = await service.generate_explanation_for_card(card)

    assert updated_card.flag == "red"
    assert updated_card.flag_reason_code == "perpetual_usage_rights"
    assert updated_card.llm_explanation == "This means you give up rights forever."

@pytest.mark.asyncio
async def test_clause_explanation_llm_failure():
    llm = FakeLLMPort(should_fail=True) # Will raise exception
    repo = FakeClauseCardRepo()
    service = ClauseExplanationService(llm, repo)

    contract_id = uuid4()
    card = ClauseCardOut(
        id=uuid4(),
        contract_id=contract_id,
        clause_type="usage_rights",
        raw_text="You grant us perpetual usage rights.",
        flag="red",
        flag_reason_code="perpetual_usage_rights",
        created_at=datetime.now(UTC)
    )
    
    updated_card = await service.generate_explanation_for_card(card)

    # LLM failed, but flag must still be returned and persisted, with the canned explanation as fallback
    assert updated_card.flag == "red"
    assert updated_card.flag_reason_code == "perpetual_usage_rights"
    assert updated_card.llm_explanation == DEFAULT_FLAG_EXPLANATIONS["perpetual_usage_rights"]
