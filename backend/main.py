import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from features.activity_log.router import router as activity_log_router
from features.analytics.router import router as analytics_router
from features.benchmarks.router import router as benchmarks_router
from features.creators.router import router as creators_router
from features.deals.router import router as deals_router
from features.deliverables.router import router as deliverables_router
from features.messages.router import router as messages_router
from features.negotiation.router import router as negotiation_router
from features.payments.router import router as payments_router
from interface.routers.auth import router as auth_router
from interface.routers.contract_intelligence import escalations_router
from interface.routers.contract_intelligence import (
    router as contract_intelligence_router,
)
from interface.routers.contracts import router as contracts_router

app = FastAPI(title="Creator OS")

# Auth uses JWT Bearer tokens (Authorization header), not cookies.
# allow_origins="*" is safe here and avoids hardcoding Vercel preview URLs.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(creators_router)
app.include_router(deals_router)
app.include_router(contracts_router)
app.include_router(deliverables_router)
app.include_router(activity_log_router)
app.include_router(negotiation_router)
app.include_router(payments_router)
app.include_router(contract_intelligence_router)
app.include_router(escalations_router)
app.include_router(benchmarks_router)
app.include_router(analytics_router)
app.include_router(messages_router)

def main():
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

if __name__ == "__main__":
    main()
