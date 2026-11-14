from uuid import UUID

from fastapi import APIRouter, Depends, Response

from features.integrations.dependencies import get_integrations_service
from features.integrations.models import (
    ApiKey,
    ApiKeyCreate,
    ApiKeyCreated,
    WebhookDelivery,
    WebhookEndpoint,
    WebhookEndpointCreate,
    WebhookEndpointCreated,
)
from features.integrations.rules import MANAGE_WEBHOOKS
from features.integrations.service import IntegrationsService
from features.workspaces.dependencies import WorkspaceContext, require_human, require_permission
from shared.errors import NotFoundError, ValidationError
from shared.http_errors import map_errors

router = APIRouter(prefix="/workspaces/{workspace}", tags=["integrations"])
_ERRORS: dict[type[Exception], int] = {NotFoundError: 404, ValidationError: 400}
# keys are managed by a signed-in owner/manager only; webhooks also by keys with webhooks:write
_keys = require_human("manage_workspace")
_hooks = require_permission("manage_workspace", MANAGE_WEBHOOKS)


@router.get("/api-keys", response_model=list[ApiKey])
async def list_keys(
    ctx: WorkspaceContext = Depends(_keys),
    svc: IntegrationsService = Depends(get_integrations_service),
):
    return await svc.list_keys(ctx.workspace.id)


@router.post("/api-keys", response_model=ApiKeyCreated, status_code=201)
async def create_key(
    request: ApiKeyCreate,
    ctx: WorkspaceContext = Depends(_keys),
    svc: IntegrationsService = Depends(get_integrations_service),
):
    return await svc.create_key(ctx.workspace.id, ctx.user_id, request)


@router.delete("/api-keys/{key_id}", status_code=204)
async def revoke_key(
    key_id: UUID,
    ctx: WorkspaceContext = Depends(_keys),
    svc: IntegrationsService = Depends(get_integrations_service),
):
    with map_errors(_ERRORS):
        await svc.revoke_key(ctx.workspace.id, key_id)
    return Response(status_code=204)


@router.get("/webhooks", response_model=list[WebhookEndpoint])
async def list_endpoints(
    ctx: WorkspaceContext = Depends(_hooks),
    svc: IntegrationsService = Depends(get_integrations_service),
):
    return await svc.list_endpoints(ctx.workspace.id)


@router.post("/webhooks", response_model=WebhookEndpointCreated, status_code=201)
async def create_endpoint(
    request: WebhookEndpointCreate,
    ctx: WorkspaceContext = Depends(_hooks),
    svc: IntegrationsService = Depends(get_integrations_service),
):
    with map_errors(_ERRORS):
        return await svc.create_endpoint(ctx.workspace.id, request)


@router.delete("/webhooks/{endpoint_id}", status_code=204)
async def delete_endpoint(
    endpoint_id: UUID,
    ctx: WorkspaceContext = Depends(_hooks),
    svc: IntegrationsService = Depends(get_integrations_service),
):
    with map_errors(_ERRORS):
        await svc.delete_endpoint(ctx.workspace.id, endpoint_id)
    return Response(status_code=204)


@router.get("/webhooks/{endpoint_id}/deliveries", response_model=list[WebhookDelivery])
async def deliveries(
    endpoint_id: UUID,
    ctx: WorkspaceContext = Depends(_hooks),
    svc: IntegrationsService = Depends(get_integrations_service),
):
    with map_errors(_ERRORS):
        return await svc.deliveries(ctx.workspace.id, endpoint_id)


@router.post("/webhooks/{endpoint_id}/test", response_model=WebhookDelivery)
async def send_test(
    endpoint_id: UUID,
    ctx: WorkspaceContext = Depends(_hooks),
    svc: IntegrationsService = Depends(get_integrations_service),
):
    with map_errors(_ERRORS):
        return await svc.send_test(ctx.workspace.id, endpoint_id)
