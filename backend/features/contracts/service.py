from datetime import UTC, datetime
from uuid import UUID, uuid4

from features.activity_log import ActivityLog, ActivityLogRepo
from features.contracts.models import Contract, ContractStatusUpdateRequest
from features.contracts.repository import ContractRepo
from features.contracts.rules import is_valid_contract_transition
from shared.errors import InvalidStatusTransition, PermissionDeniedError


class ContractService:
    def __init__(self, contract_repo: ContractRepo, activity_log_repo: ActivityLogRepo):
        self.contract_repo = contract_repo
        self.activity_log_repo = activity_log_repo

    async def create_contract(
        self,
        deal_id: UUID,
        file_path: str | None,
        brand_id: UUID,
        actor_id: UUID,
        actor_type: str
    ) -> Contract:
        contract = Contract(
            id=uuid4(),
            deal_id=deal_id,
            file_path=file_path,
            status="draft",
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC)
        )
        created = await self.contract_repo.create(contract)

        log = ActivityLog(
            id=uuid4(),
            brand_id=brand_id,
            deal_id=deal_id,
            actor_type=actor_type,
            actor_label=str(actor_id),
            action="contract_created",
            metadata={"contract_id": str(created.id), "file_path": file_path},
            created_at=datetime.now(UTC)
        )
        await self.activity_log_repo.create(log)

        return created

    async def create_personal_contract(self, creator_id: UUID, file_path: str | None) -> Contract:
        # No brand is involved, so unlike create_contract there's no
        # ActivityLog entry — this is a private review, not a deal event.
        contract = Contract(
            id=uuid4(),
            deal_id=None,
            creator_id=creator_id,
            file_path=file_path,
            status="draft",
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC)
        )
        return await self.contract_repo.create(contract)

    async def list_for_brand(self, brand_id: UUID, limit: int = 50, offset: int = 0) -> list[Contract]:
        return await self.contract_repo.list_for_brand(brand_id, limit, offset)

    async def get(self, contract_id: UUID) -> Contract | None:
        return await self.contract_repo.get(contract_id)

    async def update_creator_status(self, contract_id: UUID, creator_status: str, creator_id: UUID) -> Contract:
        owned = await self.contract_repo.list_for_creator(creator_id, limit=1000)
        if not any(c.id == contract_id for c in owned):
            raise PermissionDeniedError("This contract isn't yours")
        return await self.contract_repo.update_creator_status(contract_id, creator_status)

    async def save_raw_text(self, contract_id: UUID, raw_text: str) -> Contract:
        return await self.contract_repo.update_raw_text(contract_id, raw_text)

    async def list_for_creator(self, creator_id: UUID, limit: int = 50, offset: int = 0) -> list[Contract]:
        return await self.contract_repo.list_for_creator(creator_id, limit, offset)

    async def update_status(
        self,
        contract_id: UUID,
        request: ContractStatusUpdateRequest,
        actor_id: UUID,
        actor_type: str,
        brand_id: UUID
    ) -> Contract:
        contract = await self.contract_repo.get(contract_id)
        if not contract:
            raise ValueError("Contract not found")
            
        if not is_valid_contract_transition(contract.status, request.status):
            raise InvalidStatusTransition("Contract", contract.status, request.status)
            
        updated = await self.contract_repo.update_status(contract_id, request.status)
        
        log = ActivityLog(
            id=uuid4(),
            brand_id=brand_id,
            deal_id=contract.deal_id,
            actor_type=actor_type,
            actor_label=str(actor_id),
            action="contract_status_updated",
            metadata={"contract_id": str(contract.id), "from_status": contract.status, "to_status": request.status},
            created_at=datetime.now(UTC)
        )
        await self.activity_log_repo.create(log)
        
        return updated
