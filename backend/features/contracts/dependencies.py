"""Request-time access helpers for contract-scoped endpoints (used by other features' routers)."""

from uuid import UUID

from fastapi import HTTPException

from features.auth.dependencies import ActorContext
from features.contracts.models import Contract
from features.contracts.repository import ContractRepo
from features.contracts.supabase_repository import SupabaseContractRepo
from features.deals.dependencies import load_accessible_deal
from shared.supabase_client import get_supabase_client


def get_contract_repo() -> ContractRepo:
    """Contract repository used for access checks (tests replace this with a fake)."""
    return SupabaseContractRepo(get_supabase_client(service_role=True))


async def load_accessible_contract(contract_id: UUID, actor: ActorContext) -> Contract:
    """Return the contract if the caller may access it: a creator's own personal contract,
    or a contract on a deal the caller is on. Raises 404 / 403 otherwise."""
    contract = await get_contract_repo().get(contract_id)
    if contract is None:
        raise HTTPException(status_code=404, detail="Contract not found")
    if actor.actor_type == "creator" and contract.creator_id == actor.creator_id:
        return contract
    if contract.deal_id is None:
        raise HTTPException(status_code=403, detail="This contract isn't yours")
    await load_accessible_deal(contract.deal_id, actor)
    return contract
