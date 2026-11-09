# Feature map

Every feature has the same name everywhere. The backend uses `snake_case` because Python packages can't contain hyphens; everything else uses `kebab-case`.

| Feature | Backend | Frontend | Tests |
|---|---|---|---|
| `landing` | — | `frontend/src/features/landing/` | route smoke |
| `auth` | `backend/features/auth/` | `frontend/src/features/auth/` | `backend/tests/features/auth/` |
| `brands` | `backend/features/brands/` | — | via `auth`, `creators` |
| `creators` | `backend/features/creators/` | `frontend/src/features/creators/` | `backend/tests/features/creators/` |
| `creator-dashboard` | — (uses deals, creators, contracts, benchmarks APIs) | `frontend/src/features/creator-dashboard/` | route smoke |
| `deals` | `backend/features/deals/` | `frontend/src/features/deals/` | `backend/tests/features/deals/` |
| `contracts` | `backend/features/contracts/` | `frontend/src/features/contracts/` | `backend/tests/features/contracts/` |
| `contract-intelligence` | `backend/features/contract_intelligence/` | `frontend/src/features/contract-intelligence/` | `backend/tests/features/contract_intelligence/` |
| `deliverables` | `backend/features/deliverables/` | `frontend/src/features/deliverables/` | `backend/tests/features/deliverables/` |
| `payments` | `backend/features/payments/` | `frontend/src/features/payments/` | `backend/tests/features/payments/` |
| `negotiation` | `backend/features/negotiation/` | `frontend/src/features/negotiation/` | `backend/tests/features/negotiation/` |
| `benchmarks` | `backend/features/benchmarks/` | — (read by `creator-dashboard`) | `backend/tests/features/benchmarks/` |
| `analytics` | `backend/features/analytics/` | `frontend/src/features/analytics/` | `backend/tests/features/analytics/` |
| `messages` | `backend/features/messages/` | `frontend/src/features/messages/` | demo-mode smoke |
| `activity-log` | `backend/features/activity_log/` | `frontend/src/features/activity-log/` | demo-mode smoke |
| `demo-mode` | `backend/features/demo_mode/` | demo-account buttons in `features/auth/constants/demo-accounts.ts` | `backend/tests/smoke/test_demo_mode_contract.py` |

The rest of this page goes feature by feature. URLs are frontend routes and API paths are FastAPI routes. A route file in `frontend/src/app/` is a one-line stub that re-exports the page component listed below.

---

## `landing`
The public marketing page, with role-based login and sign-up links.
- **Pages:** `/` → `features/landing/LandingPage.tsx` (+ `landing.module.css`)
- **Shared code used:** `shared/components/ui/GradientPanel`

## `auth`
Brand and creator sign-up and login, the stored session, and the request identity (`ActorContext`) that every protected endpoint uses.
- **Pages:**
  - `/brand/login` → `BrandLoginPage.tsx`
  - `/creator/login` → `CreatorLoginPage.tsx`
  - `/brand/signup` → `BrandSignupPage.tsx`
  - `/creator/signup` → `CreatorSignupPage.tsx`
- **Frontend internals:**
  - `components/LoginForm.tsx`: one login form for both roles
  - `components/AuthPageFrame.tsx`
  - `constants/demo-accounts.ts`, `constants/auth-messages.ts`
  - `auth.module.css`
- **API:** `POST /auth/brand/signup`, `POST /auth/brand/login`, `POST /auth/creator/signup`, `POST /auth/creator/login`
- **Backend:**
  - `router.py`, `service.py` (`AuthService`), `models.py` (`AuthSession`, request models)
  - `dependencies.py`: `ActorContext`, `get_current_actor`, `get_current_brand`, plus a 30-second identity cache
- **Shared code used:** frontend `shared/lib/session.ts` (localStorage session) and `shared/lib/api-client.ts` (adds the bearer token); backend `shared/errors`, `shared/http_errors`, `shared/supabase_client`
- **Depends on:** `brands`, `creators`, `demo-mode`

## `brands`
Brand accounts and brand membership. Data only; it has no endpoints of its own.
- **Backend:** `models.py` (`Brand`, `BrandMember`), `repository.py` (ports), `supabase_repository.py`
- **Used by:** `auth` (signup and identity), `creators` (linking a creator to a brand)

## `creators`
The brand's creator roster, the creator profile view, a creator's own profile, brand linking via invite code, and growth snapshots.
- **Pages:** `/creators/[id]` → `CreatorProfilePage.tsx` (also includes the brand ↔ creator chat panel)
- **Frontend internals:** `components/GrowthTracker.tsx`, exported via `index.ts` for `creator-dashboard`
- **API:**
  - `POST /creators`, `GET /creators`, `GET /creators/{id}`
  - `PATCH /creators/me`
  - `GET /creators/me/brands`, `POST /creators/me/link-brand`
  - `POST /creators/me/growth-snapshots`, `GET /creators/me/growth-snapshots`
- **Backend:** `router.py`, `service.py` (`CreatorService`), `models.py` (`Creator`, `GrowthSnapshot`), `repository.py`, `supabase_repository.py`
- **Depends on:** `auth`, `brands`, `activity-log`; frontend uses `messages` (poll interval)

## `creator-dashboard`
The creator's home screen: stats, a deals table, linked brands, contracts, rate benchmarks and the growth tracker. It's a composition page with no backend of its own.
- **Pages:** `/creator` → `CreatorDashboardPage.tsx`
- **Frontend internals:** `components/DealsTable.tsx`
- **API it calls:** `/deals`, `/deals/stats`, `/creators/{id}`, `/creators/me/*`, `/contracts`, `/contracts/{id}/creator-status`, `/benchmarks`
- **Depends on:** `creators` (`GrowthTracker`)

## `deals`
The brand's deal pipeline and creator onboarding, the per-deal workspace, the creator's Kanban board, and deal stats and weekly value.
- **Pages:**
  - `/brand` → `BrandDealsPage.tsx`
  - `/deals/[id]` → `DealDetailPage.tsx`
  - `/creator/board` → `CreatorDealBoardPage.tsx`
- **API:** `POST /deals`, `GET /deals`, `GET /deals/stats`, `GET /deals/weekly-value`, `POST /deals/{id}/view`, `PATCH /deals/{id}/status`
- **Backend:** `router.py`, `service.py` (`DealService`), `models.py` (`Deal`), `repository.py`, `supabase_repository.py`
- **Shared code used:** `shared/constants/deal-stages.ts`, `shared/lib/status-variants.ts`, `shared/lib/format-currency.ts`
- **Depends on:** `auth`, `creators`, `activity-log`, `negotiation` (backend); frontend uses `deliverables` (status labels)

## `contracts`
Contract upload (by the brand per deal, or a creator's personal contract), the status lifecycle, the sample contract PDF and the one-click sample.
- **Pages:** `/contracts` → `ContractsPage.tsx`
- **API:**
  - `GET /contracts`, `GET /contracts/{id}`
  - `POST /deals/{deal_id}/contracts`, `POST /creators/me/contracts`
  - `PATCH /contracts/{id}/status`, `PATCH /contracts/{id}/creator-status`
  - `GET /contracts/sample-contract-pdf`, `POST /contracts/upload-sample`
- **Backend:**
  - `router.py`, `service.py` (`ContractService`), `models.py`
  - `rules.py`: status transitions
  - `contract_pdf.py`: text extraction and the sample PDF
  - `contract_storage_adapter.py`: Supabase Storage
  - `repository.py`, `supabase_repository.py`
- **Shared code used:** frontend `shared/lib/api-client.ts` (`postWithSession` for multipart uploads, `API_BASE_URL`); backend `shared/llm/gemini_adapter` (clause segmentation)
- **Depends on:** `auth`, `deals`, `contract-intelligence` (each upload is scanned), `activity-log`

## `contract-intelligence`
Rule-based red-flag clause scanning, LLM clause explanations (with canned fallbacks), escalations and their resolution, and the clause review screen.
- **Pages:** `/contracts/[id]/clauses` → `ClauseReviewPage.tsx`
- **Frontend internals:** `components/ClauseCard.tsx`, `components/HighlightedText.tsx`, `utils/find-highlights.utils.ts`
- **API:** `GET /contracts/{contract_id}/clauses`, `POST /contracts/{contract_id}/scan`, `POST /contracts/{contract_id}/escalate`, `POST /escalations/{escalation_id}/resolve`
- **Backend:**
  - `router.py`
  - `dependencies.py` (`get_contract_intelligence_service`, also used by `contracts`)
  - `service.py`, `clause_explanation_service.py`
  - `red_flag_rules.py` (including `DEFAULT_FLAG_EXPLANATIONS`), `escalation_rules.py`
  - `models.py`
  - `email_port.py` + `resend_email_adapter.py`
  - `repository.py`, `supabase_repository.py`
- **Shared code used:** `shared/llm/*`
- **Depends on:** `auth`, `contracts`

## `deliverables`
Deliverables per deal, and their production-status workflow for creators and brands.
- **Pages:** `/deliverables` → `DeliverablesPage.tsx`
- **Frontend internals:**
  - `constants/deliverable-status.ts`: exported via `index.ts` for `deals`
  - `utils/deliverable-status.utils.ts`
- **API:** `GET /deliverables`, `POST /deals/{deal_id}/deliverables`, `PATCH /deliverables/{id}/status`
- **Backend:** `router.py`, `service.py` (role rules: creators can't approve or reject), `rules.py` (transitions), `models.py`, `repository.py`, `supabase_repository.py`
- **Depends on:** `auth`, `activity-log`

## `payments`
Invoices, platform fee and net amount, mark as paid, and status changes.
- **Pages:** `/payments` → `PaymentsPage.tsx`
- **API:** `POST /payments`, `GET /payments`, `PATCH /payments/{contract_id}/mark-paid`, `PATCH /payments/{contract_id}/status`
- **Backend:** `router.py`, `service.py` (`PaymentService`), `rules.py` (invoice numbers, status validation), `models.py`, `repository.py`, `supabase_repository.py`
- **Depends on:** `auth`, `activity-log`

## `negotiation`
The per-deal negotiation workspace: fair-rate range, growth forecast, a pre-send checklist, counter-offers, AI conversation analysis and drafted scripts.
- **Pages:** `/creator/negotiate/[dealId]` → `NegotiationPage.tsx`
- **Frontend internals:** `components/ForecastChart.tsx`, `components/NegotiationChat.tsx`, `components/RateCalculatorForm.tsx`
- **API:**
  - `POST /negotiation/sessions`, `GET /negotiation/sessions`
  - `GET /negotiation/sessions/{id}/rate-range`, `GET /negotiation/sessions/{id}/forecast`
  - `PATCH /negotiation/sessions/{id}/checklist`
  - `POST /negotiation/sessions/{id}/counter-offer`, `GET /negotiation/sessions/{id}/offers`
  - `POST /negotiation/sessions/{id}/conversations`, `GET /negotiation/sessions/{id}/conversations`
  - `POST /negotiation/sessions/{id}/script`
- **Backend:** `router.py`, `service.py`, `rules.py` (rate range, checklist), `growth_forecast.py`, `models.py`, `repository.py`, `supabase_repository.py`
- **Shared code used:** `shared/llm/*`, `shared/money`
- **Depends on:** `auth`, `deals`, `creators`, `activity-log`

## `benchmarks`
Market rate percentiles by niche and follower tier.
- **API:** `GET /benchmarks?niche=&follower_tier=`
- **Backend:** `router.py`, `service.py`, `rules.py` (`compute_percentiles`), `models.py`, `repository.py`, `supabase_repository.py`
- **Used by:** `creator-dashboard`

## `analytics`
Brand-level revenue by month, the pipeline by stage, top campaigns, creator performance, overdue invoices and a roster breakdown.
- **Pages:** `/analytics` → `AnalyticsPage.tsx` (+ `components/RevenueChart.tsx`, `components/BarRow.tsx`)
- **API:** `GET /analytics/brand`
- **Backend:** `router.py`, `service.py` (fetches the data), `rules.py` (pure aggregations), `models.py`
- **Depends on:** `deals`, `creators`, `contracts`, `payments` (reads through their repository ports)

## `messages`
Brand ↔ creator chat and the unread dot in the sidebar.
- **Pages:** `/chat` → `ChatPage.tsx`
- **Frontend internals:**
  - `hooks/useUnreadMessages.ts`: used by the app shell
  - `constants/messages-polling.ts`: `MESSAGES_POLL_INTERVAL_MS`
  - both exported via `index.ts`
- **API:** `GET /messages`, `POST /messages`, `GET /messages/unread`, `POST /messages/read`
- **Backend:** `router.py`, `service.py`, `models.py`, `repository.py`, `supabase_repository.py`
- **Depends on:** `auth`, `creators`

## `activity-log`
An audit trail of deal, contract, deliverable and payment actions.
- **Pages:** `/activity` → `ActivityLogPage.tsx`
- **API:** `GET /activity-log`, `POST /activity-log`
- **Backend:** `router.py`, `service.py`, `models.py` (`ActivityLog`, written by most services), `repository.py`, `supabase_repository.py`

## `demo-mode`
Runs the whole backend on a seeded in-memory dataset when Supabase is unreachable or configured with dummy keys. Also provides demo accounts.
- **Backend:**
  - `mode.py`: `is_demo_mode`, a 0.3-second port probe
  - `fallback.py`: `DemoFallbackMixin`, which every Supabase repository inherits
  - `demo_store.py`, `in_memory_repositories.py`, `seed.py`
  - `accounts.py`: the fixed demo UUIDs
  - `demo_auth.py`: passwordless demo login and token resolution. **This is active in every environment today**; see AUDIT.md §1.5.
- **Scripts:** `backend/scripts/seed_demo.py` and `reset_demo.py` seed or wipe demo data in a *real* Supabase project. Run them as `uv run python -m scripts.seed_demo`.

---

## Shared code

| Module | Used by |
|---|---|
| `backend/shared/config.py` (`settings`) | every Supabase/LLM/email adapter |
| `backend/shared/errors.py` | services (domain errors) |
| `backend/shared/http_errors.py` (`map_errors`) | auth, contracts, creators, deals, deliverables, negotiation, payments routers |
| `backend/shared/supabase_client.py`, `supabase_query.py` | every router (client) and every `supabase_repository.py` |
| `backend/shared/pagination.py` | 7 list endpoints |
| `backend/shared/llm/` (port + Gemini adapter) | negotiation, contract-intelligence, contracts |
| `backend/shared/money.py` | negotiation, Gemini adapter |
| `frontend/src/shared/lib/api-client.ts` (+ generated `api-types.ts`) | every page |
| `frontend/src/shared/lib/session.ts` | auth, app shell, most pages |
| `frontend/src/shared/lib/format-currency.ts`, `status-variants.ts` | deals, creators, creator-dashboard, negotiation, analytics, contracts, contract-intelligence, payments |
| `frontend/src/shared/constants/deal-stages.ts` | deals, deliverables, creators, creator-dashboard, negotiation, analytics |
| `frontend/src/shared/components/ui/` (`StatusPill`, `EmptyState`, `GradientPanel`) | most pages |
| `frontend/src/app/_shell/AppShell.tsx` | the `(brand)` and `(creator)` layouts |
