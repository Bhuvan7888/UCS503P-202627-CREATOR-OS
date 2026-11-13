# Feature map

Every feature has the same name everywhere. The backend uses `snake_case` because Python packages can't contain hyphens; everything else uses `kebab-case`.

| Feature | Backend | Frontend | Tests |
|---|---|---|---|
| `landing` | — | `frontend/src/features/landing/` | route smoke |
| `auth` | `backend/features/auth/` | `frontend/src/features/auth/` | `backend/tests/features/auth/` |
| `brands` | `backend/features/brands/` | — | via `auth`, `creators` |
| `creators` | `backend/features/creators/` | `frontend/src/features/creators/` | `backend/tests/features/creators/` |
| `workspaces` | `backend/features/workspaces/` | `frontend/src/features/workspaces/` (creator shell) | `backend/tests/features/workspaces/`, e2e |
| `content` | `backend/features/content/` | `frontend/src/features/content/` | `backend/tests/features/content/`, e2e |
| `deals` | `backend/features/deals/` | `frontend/src/features/deals/` | `backend/tests/features/deals/` |
| `contracts` | `backend/features/contracts/` | `frontend/src/features/contracts/` | `backend/tests/features/contracts/` |
| `contract-intelligence` | `backend/features/contract_intelligence/` | `frontend/src/features/contract-intelligence/` | `backend/tests/features/contract_intelligence/` |
| `deliverables` | `backend/features/deliverables/` | `frontend/src/features/deliverables/` | `backend/tests/features/deliverables/` |
| `payments` | `backend/features/payments/` | `frontend/src/features/payments/` | `backend/tests/features/payments/` |
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
  - `/creator/login` → `CreatorLoginPage.tsx` (email/password or Google)
  - `/brand/signup` → `BrandSignupPage.tsx`
  - `/creator/signup` → `CreatorSignupPage.tsx` (email/password or Google)
  - `/auth/callback` → `OAuthCallbackPage.tsx`: Supabase sends Google sign-ins here with the session in the URL fragment
- **Frontend internals:**
  - `components/LoginForm.tsx`: one login form for both roles
  - `components/AuthPageFrame.tsx`, `components/GoogleButton.tsx` (redirects to Supabase `/auth/v1/authorize?provider=google`; no Supabase SDK in the browser)
  - `constants/demo-accounts.ts`, `constants/auth-messages.ts`
  - `auth.module.css`
- **API:** `POST /auth/brand/signup`, `POST /auth/brand/login`, `POST /auth/creator/signup`, `POST /auth/creator/login`, `POST /auth/creator/oauth` (Bearer = Supabase access token; creates the creator profile on first Google sign-in)
- **Backend:**
  - `router.py`, `service.py` (`AuthService`), `models.py` (`AuthSession`, request models)
  - `dependencies.py`: `ActorContext`, `get_current_actor`, `get_current_brand`, `get_current_user_id` (identity without a brand/creator profile, used by workspace routes), plus a 30-second identity cache
- **Shared code used:** frontend `shared/lib/session.ts` (localStorage session) and `shared/lib/api-client.ts` (adds the bearer token); backend `shared/errors`, `shared/http_errors`, `shared/supabase_client`
- **Depends on:** `brands`, `creators`, `demo-mode`

## `brands`
Brand accounts and brand membership. Data only; it has no endpoints of its own.
- **Backend:** `models.py` (`Brand`, `BrandMember`), `repository.py` (ports), `supabase_repository.py`
- **Used by:** `auth` (signup and identity), `creators` (linking a creator to a brand)

## `creators`
The brand's creator roster, the creator profile view, and brand linking via invite code.
- **Pages:** `/creators/[id]` → `CreatorProfilePage.tsx` (also includes the brand ↔ creator chat panel)
- **API:**
  - `POST /creators`, `GET /creators`, `GET /creators/{id}`
  - `GET /creators/me/brands`, `POST /creators/me/link-brand`
- **Backend:** `router.py`, `service.py` (`CreatorService`), `models.py` (`Creator`), `repository.py`, `supabase_repository.py`
- **Depends on:** `auth`, `brands`, `activity-log`; frontend uses `messages` (poll interval)

## `deals`
The brand's deal pipeline and creator onboarding, and the per-deal workspace.
- **Pages:**
  - `/brand` → `BrandDealsPage.tsx`
  - `/deals/[id]` → `DealDetailPage.tsx`
- **API:** `POST /deals`, `GET /deals`, `POST /deals/{id}/view`, `PATCH /deals/{id}/status`
- **Backend:** `router.py`, `service.py` (`DealService`), `models.py` (`Deal`), `repository.py`, `supabase_repository.py`
- **Shared code used:** `shared/constants/deal-stages.ts`, `shared/lib/status-variants.ts`, `shared/lib/format-currency.ts`
- **Depends on:** `auth`, `creators`, `activity-log`; frontend uses `deliverables` (status labels)

## `contracts`
Contract upload by the brand per deal, the status lifecycle and the sample contract PDF.
- **Pages:** `/contracts` → `ContractsPage.tsx`
- **API:**
  - `GET /contracts`, `GET /contracts/{id}`
  - `POST /deals/{deal_id}/contracts`
  - `PATCH /contracts/{id}/status`
  - `GET /contracts/sample-contract-pdf`
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

## `workspaces`
The creator's workspace and its shell. Every creator gets a primary "My Workspace" on first visit (race-safe); up to 3
owned workspaces (fair use, the app is free). URLs accept the slug (`ws-1a2b3c4d`) or the id and show the slug.
- **Pages:**
  - `/dashboard` → `WorkspaceRedirectPage.tsx` (opens the primary workspace; brands go to `/brand`)
  - `/dashboard/[workspace]/*` layout → `WorkspaceShell.tsx`: sidebar (workspace switcher with "new workspace", nav groups, user menu with Sign out), top bar (sidebar toggle saved in localStorage, ⌘K)
- **Frontend internals:** `components/CommandPalette.tsx` (quick actions + content search), `components/PageHeader.tsx` (breadcrumb, icon tile, title, actions), `constants/nav.ts` (only built pages are listed), `hooks/useWorkspace.ts` (active workspace context); `index.ts` exports `PageHeader`, `useWorkspace`
- **API:** `GET /workspaces`, `POST /workspaces`, `GET /workspaces/{workspace}`, `GET /workspaces/{workspace}/members`
- **Backend:** `router.py`, `service.py` (`WorkspaceService`), `rules.py` (slug, cap), `dependencies.py` (`require_workspace_member` → `WorkspaceContext`), `models.py`, `repository.py` (`WorkspaceRepo`, `UserDirectory`), `supabase_repository.py`
- **Database:** `supabase/migrations/20261113000000_creator_workspaces.sql`
- **Depends on:** `auth` (`get_current_user_id`), `creators`

## `content`
Content items from idea to published: Home (KPIs, content by platform, recent content, quick actions, onboarding banner),
the Content Pipeline kanban (drag-and-drop or a "Move to" menu, filters) and the 5-step Add New Content Idea wizard.
Target platforms are planning tags only — Creator OS does not post anywhere.
- **Pages:** `/dashboard/[workspace]` → `HomePage.tsx`; `/dashboard/[workspace]/kanban` → `ContentPipelinePage.tsx` (`?new=1` opens the wizard)
- **Frontend internals:** `components/AddContentWizard.tsx`, `components/KanbanBoard.tsx`, `hooks/useContent.ts`, `constants/content.ts` (types, stages, platforms), `content.module.css`
- **API:** `GET /workspaces/{workspace}/content`, `POST /workspaces/{workspace}/content`, `PATCH /workspaces/{workspace}/content/{item_id}`, `GET /workspaces/{workspace}/content/stats`
- **Backend:** `router.py`, `service.py` (`ContentService`: assignee must be a member, other workspaces' items are 404), `rules.py` (KPIs with 30-day deltas), `models.py`, `repository.py`, `supabase_repository.py`
- **Database:** `supabase/migrations/20261113010000_content_items.sql`
- **Depends on:** `workspaces`

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
| `backend/shared/http_errors.py` (`map_errors`) | auth, contracts, creators, deals, deliverables, payments, workspaces, content routers |
| `backend/shared/supabase_client.py`, `supabase_query.py` | every router (client) and every `supabase_repository.py` |
| `backend/shared/pagination.py` | 7 list endpoints |
| `backend/shared/llm/` (port + Gemini adapter) | contract-intelligence, contracts |
| `frontend/src/shared/lib/api-client.ts` (+ generated `api-types.ts`) | every page |
| `frontend/src/shared/lib/session.ts` | auth, app shell, most pages |
| `frontend/src/shared/lib/format-currency.ts`, `status-variants.ts` | deals, creators, analytics, contracts, contract-intelligence, payments |
| `frontend/src/shared/constants/deal-stages.ts` | deals, deliverables, creators, analytics |
| `frontend/src/shared/components/ui/` (`StatusPill`, `EmptyState`, `GradientPanel`) | most brand pages |
| `frontend/src/shared/components/ui/Dialog.tsx` (native `<dialog>` modal) | content (Add Content wizard), workspaces (⌘K palette) |
| `frontend/src/app/_shell/AppShell.tsx` | the `(brand)` layout (brand app only; creators are sent to `/dashboard`) |
