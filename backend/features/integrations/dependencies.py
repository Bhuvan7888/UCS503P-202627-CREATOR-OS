"""Wiring for the integrations service (used by workspaces for key auth and by routers that emit events)."""

import logging
from typing import Any
from uuid import UUID

from fastapi import BackgroundTasks

from features.integrations.service import IntegrationsService
from features.integrations.supabase_repository import SupabaseApiKeyRepo, SupabaseWebhookRepo
from shared.supabase_client import get_supabase_client

logger = logging.getLogger(__name__)


def get_integrations_service() -> IntegrationsService:
    client = get_supabase_client(service_role=True)
    return IntegrationsService(SupabaseApiKeyRepo(client), SupabaseWebhookRepo(client))


async def _emit_and_deliver(workspace_id: UUID, event: str, data: dict[str, Any]) -> None:
    service = get_integrations_service()
    try:
        for delivery in await service.emit(workspace_id, event, data):
            await service.deliver(delivery)
    except Exception:
        logger.exception("Could not queue webhook event %s", event)


def emit_event(
    background: BackgroundTasks, workspace_id: UUID, event: str, data: dict[str, Any]
) -> None:
    """Queue a webhook event and send it after the response (never delays or fails the request)."""
    background.add_task(_emit_and_deliver, workspace_id, event, data)
