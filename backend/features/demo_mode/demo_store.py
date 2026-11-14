from features.demo_mode.in_memory_repositories import (
    ContractOwnerMap,
    DealOwnerMap,
    DemoAccountRepo,
    DemoActivityLogRepo,
    DemoApiKeyRepo,
    DemoAuditRepo,
    DemoBrandMemberRepo,
    DemoBrandRepo,
    DemoClauseCardRepo,
    DemoContentRepo,
    DemoContractRepo,
    DemoCreatorRepo,
    DemoCrmDealRepo,
    DemoDealRepo,
    DemoDeliverableRepo,
    DemoEscalationRepo,
    DemoKnowledgeRepo,
    DemoNotificationRepo,
    DemoMessageRepo,
    DemoPaymentRepo,
    DemoPublishRequestRepo,
    DemoScriptRepo,
    DemoSuggestionRepo,
    DemoTeamRepo,
    DemoTicketRepo,
    DemoWebhookRepo,
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
        self.deal_repo = DemoDealRepo()
        self.contract_repo = DemoContractRepo()
        self.deliverable_repo = DemoDeliverableRepo()
        self.activity_log_repo = DemoActivityLogRepo()
        self.payment_repo = DemoPaymentRepo()
        self.message_repo = DemoMessageRepo()
        self.workspace_repo = DemoWorkspaceRepo()
        self.content_repo = DemoContentRepo()
        self.script_repo = DemoScriptRepo()
        self.knowledge_repo = DemoKnowledgeRepo()
        self.suggestion_repo = DemoSuggestionRepo()
        self.publish_request_repo = DemoPublishRequestRepo()
        self.crm_deal_repo = DemoCrmDealRepo()
        self.team_repo = DemoTeamRepo()
        self.audit_repo = DemoAuditRepo()
        self.api_key_repo = DemoApiKeyRepo()
        self.webhook_repo = DemoWebhookRepo()
        self.account_repo = DemoAccountRepo()
        self.notification_repo = DemoNotificationRepo()
        self.ticket_repo = DemoTicketRepo()
        self.user_directory = DemoUserDirectory()
        self.clause_card_repo = DemoClauseCardRepo()
        self.escalation_repo = DemoEscalationRepo()
        # Resolve deal ownership for deals created after seeding (see DealOwnerMap).
        for repo in (self.contract_repo, self.deliverable_repo):
            repo.deal_brand_map = DealOwnerMap(self.deal_repo, "brand_id")
            repo.deal_creator_map = DealOwnerMap(self.deal_repo, "creator_id")
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
