"""Point the routers' deal/contract access checks at a test's fake repositories."""

import pytest

import features.contracts.dependencies as contract_access
import features.deals.dependencies as deal_access


def use_fake_access_repos(
    monkeypatch: pytest.MonkeyPatch, deal_repo=None, contract_repo=None
) -> None:
    if deal_repo is not None:
        monkeypatch.setattr(deal_access, "get_deal_repo", lambda: deal_repo)
    if contract_repo is not None:
        monkeypatch.setattr(contract_access, "get_contract_repo", lambda: contract_repo)
