from domain.interfaces.repositories import (
    BrandMemberRepo,
    BrandRepo,
    ContractRepo,
    CreatorRepo,
)
from features.activity_log import ActivityLogRepo
from features.deals import DealRepo
from features.deliverables import DeliverableRepo
from features.payments import PaymentRepo
from tests.fakes.fake_repos import (
    FakeActivityLogRepo,
    FakeBrandMemberRepo,
    FakeBrandRepo,
    FakeContractRepo,
    FakeCreatorRepo,
    FakeDealRepo,
    FakeDeliverableRepo,
    FakePaymentRepo,
)


def test_brand_repo_conforms():
    assert issubclass(FakeBrandRepo, BrandRepo)

def test_brand_member_repo_conforms():
    assert issubclass(FakeBrandMemberRepo, BrandMemberRepo)

def test_creator_repo_conforms():
    assert issubclass(FakeCreatorRepo, CreatorRepo)

def test_deal_repo_conforms():
    assert issubclass(FakeDealRepo, DealRepo)

def test_contract_repo_conforms():
    assert issubclass(FakeContractRepo, ContractRepo)

def test_deliverable_repo_conforms():
    assert issubclass(FakeDeliverableRepo, DeliverableRepo)

def test_activity_log_repo_conforms():
    assert issubclass(FakeActivityLogRepo, ActivityLogRepo)

def test_payment_repo_conforms():
    assert issubclass(FakePaymentRepo, PaymentRepo)
