from features.demo_mode.in_memory_repositories import (
    DemoActivityLogRepo,
    DemoBrandMemberRepo,
    DemoBrandRepo,
    DemoClauseCardRepo,
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
        self.benchmark_repo = DemoRateBenchmarkRepo()
        self.clause_card_repo = DemoClauseCardRepo()
        self.escalation_repo = DemoEscalationRepo()
        self._seeded = False

    def seed_if_needed(self):
        if self._seeded:
            return
        self._seeded = True
        seed_demo_data(self)


store = DemoStore()
