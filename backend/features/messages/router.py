from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from features.messages.models import Message, MessageCreateRequest
from features.messages.service import MessageService
from features.messages.supabase_repository import SupabaseMessageRepo
from infrastructure.supabase.repos import SupabaseCreatorRepo
from interface.dependencies import ActorContext, get_current_actor
from shared.supabase_client import get_supabase_client

router = APIRouter(prefix="/messages", tags=["messages"])

class UnreadSummaryResponse(BaseModel):
    unread_count: int
    has_unread: bool
    by_contact: dict[str, int]

def get_message_service() -> MessageService:
    return MessageService(SupabaseMessageRepo(get_supabase_client(service_role=True)))

async def _resolve_thread(with_id: UUID, actor: ActorContext) -> tuple[UUID, UUID]:
    """Returns (brand_id, creator_id) for the thread, after checking the
    caller is actually linked to the other party — a creator or brand can't
    message someone they have no relationship with."""
    creator_repo = SupabaseCreatorRepo(get_supabase_client(service_role=True))
    if actor.actor_type == "brand":
        brand_id, creator_id = actor.brand_id, with_id
    else:
        brand_id, creator_id = with_id, actor.creator_id
    if not await creator_repo.is_linked_to_brand(creator_id, brand_id):
        raise HTTPException(status_code=403, detail="No relationship with that account")
    return brand_id, creator_id

@router.get("/unread", response_model=UnreadSummaryResponse)
async def get_unread_summary(
    actor: ActorContext = Depends(get_current_actor),
    service: MessageService = Depends(get_message_service),
):
    actor_id = actor.brand_id if actor.actor_type == "brand" else actor.creator_id
    return await service.get_unread_summary(actor.actor_type, actor_id)

@router.post("/read")
async def mark_read(
    with_id: UUID,
    actor: ActorContext = Depends(get_current_actor),
    service: MessageService = Depends(get_message_service),
):
    brand_id, creator_id = await _resolve_thread(with_id, actor)
    count = await service.mark_thread_read(brand_id, creator_id, actor.actor_type)
    return {"marked_read": count}

@router.get("", response_model=list[Message])
async def list_messages(
    with_id: UUID,
    actor: ActorContext = Depends(get_current_actor),
    service: MessageService = Depends(get_message_service)
):
    brand_id, creator_id = await _resolve_thread(with_id, actor)
    messages = await service.list_thread(brand_id, creator_id)
    await service.mark_thread_read(brand_id, creator_id, actor.actor_type)
    return messages

@router.post("", response_model=Message)
async def send_message(
    with_id: UUID,
    request: MessageCreateRequest,
    actor: ActorContext = Depends(get_current_actor),
    service: MessageService = Depends(get_message_service)
):
    brand_id, creator_id = await _resolve_thread(with_id, actor)
    return await service.send(brand_id, creator_id, actor.actor_type, request.body)
