import asyncio
import logging
from collections.abc import AsyncIterator
from concurrent.futures import ThreadPoolExecutor
from contextlib import asynccontextmanager, suppress

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from features.account.router import router as account_router
from features.activity_log.router import router as activity_log_router
from features.ai_assist.router import router as ai_assist_router
from features.analytics.router import router as analytics_router
from features.approvals.router import router as approvals_router
from features.auth.router import router as auth_router
from features.content.router import router as content_router
from features.content.supabase_repository import SupabaseContentRepo
from features.contract_intelligence.router import escalations_router
from features.contract_intelligence.router import router as contract_intelligence_router
from features.contracts.router import router as contracts_router
from features.creators.router import router as creators_router
from features.crm.router import router as crm_router
from features.deals.router import router as deals_router
from features.deliverables.router import router as deliverables_router
from features.integrations.dependencies import get_integrations_service
from features.integrations.router import router as integrations_router
from features.messages.router import router as messages_router
from features.notifications.dependencies import get_notification_service
from features.notifications.router import router as notifications_router
from features.payments.router import router as payments_router
from features.support.router import router as support_router
from features.workspaces.router import invites_router
from features.workspaces.router import router as workspaces_router
from features.workspaces.supabase_repository import SupabaseWorkspaceRepo
from shared.config import settings
from shared.supabase_client import get_supabase_client

logger = logging.getLogger(__name__)
WEBHOOK_RETRY_INTERVAL_SECONDS = 30
DB_THREADS = 64
DEADLINE_SWEEP_EVERY = 120  # ticks of the loop (= 1 hour)


async def _background_work_forever() -> None:
    """Webhook retries every 30 s and deadline reminders every hour.

    ponytail: runs in every API process; both jobs are safe to run concurrently (atomic webhook claims,
    deduplicated reminders), but a dedicated worker is the upgrade if volume grows.
    """
    tick = 0
    while True:
        try:
            await get_integrations_service().process_due()
            if tick % DEADLINE_SWEEP_EVERY == 0:
                client = get_supabase_client(service_role=True)
                await get_notification_service().remind_due_tomorrow(
                    SupabaseContentRepo(client), SupabaseWorkspaceRepo(client)
                )
        except Exception:
            logger.exception("Background loop failed")
        tick += 1
        await asyncio.sleep(WEBHOOK_RETRY_INTERVAL_SECONDS)


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    # Database calls run in worker threads (the Supabase client is synchronous); the default pool
    # (CPU count + 4) would queue requests long before 100 concurrent users.
    asyncio.get_running_loop().set_default_executor(ThreadPoolExecutor(max_workers=DB_THREADS))
    task = asyncio.create_task(_background_work_forever())
    yield
    task.cancel()
    with suppress(asyncio.CancelledError):
        await task


app = FastAPI(title="Creator OS", lifespan=lifespan)

# Auth uses JWT Bearer tokens (Authorization header), not cookies.
# allow_origins="*" is safe here and avoids hardcoding Vercel preview URLs.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", tags=["ops"])
async def health() -> dict[str, str]:
    """For the hosting platform's health check: the process is up (no database call, no data).
    `ai` says whether a Gemini key is configured, so a deploy missing it is visible at a glance."""
    return {"status": "ok", "ai": "configured" if settings.ai_configured else "missing"}


app.include_router(auth_router)
app.include_router(creators_router)
app.include_router(deals_router)
app.include_router(contracts_router)
app.include_router(deliverables_router)
app.include_router(activity_log_router)
app.include_router(payments_router)
app.include_router(contract_intelligence_router)
app.include_router(escalations_router)
app.include_router(analytics_router)
app.include_router(messages_router)
app.include_router(workspaces_router)
app.include_router(invites_router)
app.include_router(content_router)
app.include_router(ai_assist_router)
app.include_router(approvals_router)
app.include_router(crm_router)
app.include_router(integrations_router)
app.include_router(notifications_router)
app.include_router(support_router)
app.include_router(account_router)


def main():
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)


if __name__ == "__main__":
    main()
