from features.demo_mode.in_memory_repositories import (
    ContractOwnerMap,
    DealOwnerMap,
    DemoActivityLogRepo,
    DemoBrandMemberRepo,
    DemoBrandRepo,
    DemoClauseCardRepo,
    DemoContentRepo,
    DemoContractRepo,
    DemoCreatorRepo,
    DemoDealRepo,
    DemoDeliverableRepo,
    DemoEscalationRepo,
    DemoGrowthSnapshotRepo,
    DemoMessageRepo,
    DemoNegotiationConversationRepo,
    DemoNegotiationSessionRepo,
    DemoPaymentRepo,
    DemoRateBenchmarkRepo,
    DemoUserDirectory,
    DemoWorkspaceRepo,
)
from features.demo_mode.seed import seed_demo_data


# --- Global Demo Store Container ---
class DemoStore:
    def __init__(self):
        self.brand_repo = DemoBrandRepo()
        self.brand_member_repo = DemoBrandMemberRepo()
        self.creator_repo = DemoCreatorRepo()
        self.growth_repo = DemoGrowthSnapshotRepo()
        self.deal_repo = DemoDealRepo()
        self.contract_repo = DemoContractRepo()
        self.deliverable_repo = DemoDeliverableRepo()
        self.activity_log_repo = DemoActivityLogRepo()
        self.payment_repo = DemoPaymentRepo()
        self.negotiation_session_repo = DemoNegotiationSessionRepo()
        self.negotiation_conv_repo = DemoNegotiationConversationRepo()
        self.message_repo = DemoMessageRepo()
        self.workspace_repo = DemoWorkspaceRepo()
        self.content_repo = DemoContentRepo()
        self.user_directory = DemoUserDirectory()
        self.benchmark_repo = DemoRateBenchmarkRepo()
        self.clause_card_repo = DemoClauseCardRepo()
        self.escalation_repo = DemoEscalationRepo()
        # Resolve deal ownership for deals created after seeding (see DealOwnerMap).
        for repo in (self.contract_repo, self.negotiation_session_repo):
            repo.deal_brand_map = DealOwnerMap(self.deal_repo, "brand_id")
            repo.deal_creator_map = DealOwnerMap(self.deal_repo, "creator_id")
        self.deliverable_repo.deal_brand_map = DealOwnerMap(self.deal_repo, "brand_id")
        self.deliverable_repo.deal_creator_map = DealOwnerMap(self.deal_repo, "creator_id")
        # Same for records keyed by contract (payments, clause cards, escalations).
        contract_brand = ContractOwnerMap(self.contract_repo, self.deal_repo, "brand_id")
        self.payment_repo.contract_brand_map = contract_brand
        self.payment_repo.contract_creator_map = ContractOwnerMap(
            self.contract_repo, self.deal_repo, "creator_id"
        )
        self.clause_card_repo.contract_brand_map = ContractOwnerMap(
            self.contract_repo, self.deal_repo, "brand_id"
        )
        self.escalation_repo.contract_brand_map = ContractOwnerMap(
            self.contract_repo, self.deal_repo, "brand_id"
        )
        self._seeded = False

    def seed_if_needed(self):
        if self._seeded:
            return
        self._seeded = True
        seed_demo_data(self)


store = DemoStore()
