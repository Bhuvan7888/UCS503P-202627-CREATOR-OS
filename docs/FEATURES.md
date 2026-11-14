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
| `account` | `backend/features/account/` | `frontend/src/features/account/` | `backend/tests/features/account/`, e2e |
| `notifications` | `backend/features/notifications/` | `frontend/src/features/notifications/` | `backend/tests/features/notifications/`, e2e |
| `support` | `backend/features/support/` | `frontend/src/features/support/` | `backend/tests/features/notifications/test_notifications_api.py`, e2e |
| `integrations` | `backend/features/integrations/` | `frontend/src/features/integrations/` | `backend/tests/features/integrations/`, e2e |
| `crm` | `backend/features/crm/` | `frontend/src/features/crm/` | `backend/tests/features/crm/`, e2e |
| `approvals` | `backend/features/approvals/` | `frontend/src/features/approvals/` | `backend/tests/features/approvals/`, e2e |
| `ai-assist` | `backend/features/ai_assist/` | `frontend/src/features/ai-assist/` | `backend/tests/features/ai_assist/`, e2e |
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
Rule-based red-flag clause scanning, LLM clause explanations (with canned fallbacks), escalations and their resolution, and the clause review screen — shown to both brands and creators (flagged clauses + clean contract toggle).
- **Pages:**
  - brand app: `/contracts/[id]/clauses` → `ClauseReviewPage.tsx`
  - creator workspace: `/dashboard/[workspace]/contracts/[id]` → `WorkspaceClauseReviewPage.tsx` (list: `/dashboard/[workspace]/contracts` → `features/contracts/WorkspaceContractsPage.tsx`)
- **Frontend internals:** `components/ClauseReview.tsx` (the shared screen), `components/ClauseCard.tsx`, `components/HighlightedText.tsx`, `utils/find-highlights.utils.ts`
- **API:** `GET /contracts/{contract_id}/clauses`, `POST /contracts/{contract_id}/scan`, `POST /contracts/{contract_id}/escalate`, `POST /escalations/{escalation_id}/resolve`
- **Backend:**
  - `router.py`
  - `dependencies.py` (`get_contract_intelligence_service`, also used by `contracts`)
  - `service.py`, `clause_explanation_service.py`
  - `red_flag_rules.py` (including `DEFAULT_FLAG_EXPLANATIONS`), `escalation_rules.py`
  - `models.py`
  - `repository.py`, `supabase_repository.py`
- **Shared code used:** `shared/llm/*`, `shared/email/*` (escalation emails)
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
- **Team (Phase 6a):** 11 permissions (`rules.PERMISSIONS`); the owner has all; Script Writer / Video Editor / Brand Manager
  default to 5 / 6 / 8 and the owner can change them per workspace. `require_permission(...)` guards every workspace
  route and audits refusals; the shell hides pages a role can't open and shows a "no access" panel. Invites: 2 seats per
  role, hashed one-time tokens valid 7 days, email must match on accept; email is best effort (Resend) and the link is
  always shown to copy. Changing roles, removing members and editing permissions are owner-only.
- **More pages:** `/dashboard/[workspace]/settings/workspace` → `WorkspaceSettingsPage.tsx` (General, Members, Roles,
  Audit log); `/invite/[token]` → `InvitePage.tsx` (a pending invite survives sign-in via `PENDING_INVITE_KEY`);
  `components/SettingsHeader.tsx` (Settings tab bar, also used by AI knowledge)
- **API:** `GET /workspaces`, `POST /workspaces`, `GET/PATCH /workspaces/{workspace}` (GET records "Opened the workspace"),
  `GET /workspaces/{workspace}/members`, `PATCH/DELETE …/members/{user_id}`, `GET/POST …/invites`,
  `DELETE …/invites/{invite_id}`, `GET …/roles`, `PUT …/roles/{role}`, `GET …/audit-log`, `GET /invites/{token}`,
  `POST /invites/{token}/accept`
- **Backend:** `router.py`, `service.py` (`WorkspaceService`, `TeamService`), `rules.py` (slug, cap, permissions, seats, invite tokens), `dependencies.py` (`require_workspace_member` → `WorkspaceContext`, `require_permission`), `models.py`, `repository.py` (`WorkspaceRepo`, `UserDirectory`), `supabase_repository.py`
- **Database:** `supabase/migrations/20261113000000_creator_workspaces.sql`, `20261117000000_team_and_audit.sql` (`workspace_invites`, `workspace_role_permissions`, `audit_log`)
- **Depends on:** `auth` (`get_current_user_id`), `creators`

## `content`
Content items from idea to published: Home (KPIs, content by platform, recent content, quick actions, onboarding banner),
the Content Pipeline kanban (drag-and-drop or a "Move to" menu, filters) and the 5-step Add New Content Idea wizard.
Target platforms are planning tags only — Creator OS does not post anywhere.
Each item has one script (Scripts page, auto-saved; the first script moves an idea to Scripted).
- **Pages:**
  - `/dashboard/[workspace]` → `HomePage.tsx`
  - `/dashboard/[workspace]/kanban` → `ContentPipelinePage.tsx` (`?new=1` opens the wizard, `?item=<id>` opens the item editor)
  - `/dashboard/[workspace]/scripts` → `ScriptsPage.tsx` (`?item=<id>` selects an item)
  - `/dashboard/[workspace]/schedule` → `CalendarPage.tsx`: week/month grid (due-date and scheduled chips; a day opens the wizard with that due date), feed of scheduled/published items
- **Frontend internals:** `components/AddContentWizard.tsx`, `components/ContentItemDialog.tsx` (edit an item, inline AI, schedule, request approval), `utils/calendar-dates.ts`, `components/KanbanBoard.tsx`, `hooks/useContent.ts`, `constants/content.ts` (types, stages, platforms), `content.module.css`
- **API:** `GET /workspaces/{workspace}/content`, `POST /workspaces/{workspace}/content`, `PATCH /workspaces/{workspace}/content/{item_id}`, `GET /workspaces/{workspace}/content/stats`, `GET/PUT /workspaces/{workspace}/content/{item_id}/script`
- **Backend:** `router.py`, `service.py` (`ContentService`: assignee must be a member, other workspaces' items are 404, scripts), `rules.py` (KPIs with 30-day deltas; Scripted = has a script or moved past Idea; `apply_stage_rules`: scheduling moves an item to Scheduled, Published stamps `published_at`), `models.py`, `repository.py` (`ContentRepo`, `ScriptRepo`), `supabase_repository.py`
- **Database:** `supabase/migrations/20261113010000_content_items.sql`, `20261114000000_scripts_and_ai.sql` (`content_scripts`), `20261115000000_calendar_and_approvals.sql` (`scheduled_at`, `published_at`)
- **Depends on:** `workspaces`; frontend uses `ai-assist` (`GenerateButton`)

## `account`
The signed-in person (shared across all their workspaces): profile and notification preferences.
- **Pages:** `/dashboard/[workspace]/settings/profile` → `ProfilePage.tsx`; `/dashboard/[workspace]/settings/notifications` → `NotificationPreferencesPage.tsx`
- **API:** `GET/PUT /me/profile` (the name is saved on the login via `UserDirectory.set_name`, so teammates see it; email is read-only), `GET/PUT /me/notification-preferences`
- **Backend:** `router.py`, `service.py` (`AccountService`), `rules.py` (category defaults, quiet hours across midnight, `may_email`), `models.py`, `repository.py`, `supabase_repository.py`
- **Database:** `user_profiles`, `notification_preferences` (migration 008)

## `notifications`
The per-person inbox. Created only by real events (routers call `dependencies.notify(...)`, which runs after the
response and never fails the request): assignment → assignee; publish waiting → owner (high priority); approved /
rejected → the person who asked; member joined → owner; due tomorrow → assignee or owner (hourly sweep in the
`main.py` background loop, deduplicated per item and day). Categories: task_assignments, publishing_updates,
deadlines, workspace_activity. In-app per category; email per category unless Do Not Disturb or quiet hours (profile
timezone); never emails in demo mode.
- **Pages:** `NotificationBell` in the shell's top bar (unread badge polled every 60 s and refreshed on
  `creatoros:notifications-changed`), `/dashboard/[workspace]/notifications` → `NotificationsPage.tsx`
- **API:** `GET /workspaces/{workspace}/notifications?archived=`, `GET …/notifications/unread-count`, `POST …/notifications/read` (ids or all), `POST …/notifications/{id}/archive` — people only (`require_person`), never API keys
- **Backend:** `router.py`, `dependencies.py` (`get_notification_service`, `notify`), `service.py` (`NotificationService`, `remind_due_tomorrow`), `models.py`, `repository.py`, `supabase_repository.py`
- **Database:** `notifications` (migration 008)

## `support`
Help tickets per workspace and person, FAQ written for this app.
- **Pages:** `/dashboard/[workspace]/support` → `SupportPage.tsx` (Overview, My Tickets, Knowledge Base, create-ticket dialog)
- **API:** `GET/POST /workspaces/{workspace}/support/tickets`, `POST …/support/tickets/{id}/close` (people only); new tickets are emailed to `SUPPORT_EMAIL` when set
- **Backend:** `router.py`, `service.py` (`SupportService`), `models.py`, `repository.py`, `supabase_repository.py`
- **Database:** `support_tickets` (migration 008)

## `integrations`
API keys that let an agent or automation act inside one workspace, and signed outgoing webhooks.
- **Keys:** `cos_<prefix>_<secret>`, shown once, SHA-256 hash stored. `Authorization: Bearer <key>` on any
  `/workspaces/{workspace}/…` route resolves (in `workspaces.dependencies.require_workspace_member`) to role `agent` with
  scope-derived permissions (`rules.SCOPE_PERMISSIONS`; `owner` = all scopes). Keys never get manage_workspace,
  invite_members, view_brand_deals or view_settings, so they can't approve, manage keys/team/roles or open the CRM.
  Every key call is audited as "API key · <name>"; agent publish requests are stored with `source='agent'`.
- **Webhooks:** https URLs on public addresses only (checked at creation and before every send); body signed with
  HMAC-SHA256 over `<X-CreatorOS-Timestamp>.<raw body>` (`X-CreatorOS-Signature: sha256=…`); events
  `publish.pending_approval`, `publish.approved`, `publish.rejected`, `content.stage_changed` (emitted by the approvals and
  content routers via `dependencies.emit_event`); first attempt right after the response, retries 1m→8h (~15 h) by the
  loop started in `main.py` (atomic claims, safe with several processes).
- **Pages:** `/dashboard/[workspace]/settings/api-keys` → `ApiKeysPage.tsx`; `/dashboard/[workspace]/settings/webhooks` → `WebhooksPage.tsx`
- **API:** `GET/POST /workspaces/{workspace}/api-keys`, `DELETE …/api-keys/{key_id}` (people with manage_workspace only);
  `GET/POST …/webhooks`, `DELETE …/webhooks/{endpoint_id}`, `GET …/webhooks/{endpoint_id}/deliveries`, `POST …/webhooks/{endpoint_id}/test`
  (manage_workspace, or a key with webhooks:write)
- **Backend:** `router.py`, `dependencies.py` (`get_integrations_service`, `emit_event`), `service.py` (`IntegrationsService`), `rules.py`, `models.py`, `repository.py`, `supabase_repository.py`
- **Database:** `supabase/migrations/20261118000000_api_keys_and_webhooks.sql`
- **Depends on:** used by `workspaces` (key auth), `approvals` and `content` (events)

## `crm`
Brand CRM: the creator's own brand deals (prospect → paid, cancelled) with KPIs, filters, sorting, paging, CSV export
and Pipeline & Insights, plus a read-only "On Creator OS" list of deals brands made with them on the platform.
Totals stay per currency (no conversion). Content links to a deal through "Deal Association" (`content_items.crm_deal_id`).
- **Pages:** `/dashboard/[workspace]/crm` → `CrmPage.tsx`
- **Frontend internals:** `components/DealWizard.tsx` (Create/Edit Deal, 4 steps; optional linked content item), `constants/crm.ts`, `crm.module.css`
- **API:** `GET/POST /workspaces/{workspace}/crm/deals`, `PATCH/DELETE …/crm/deals/{deal_id}`, `GET …/crm/stats`, `GET …/crm/platform-deals`
- **Backend:** `router.py`, `service.py` (`CrmService`; other workspaces' deals → 404; platform deals via `deals.list_for_creator` + `workspaces.creator_id`), `rules.py` (`crm_stats`), `models.py`, `repository.py`, `supabase_repository.py`
- **Database:** `supabase/migrations/20261116000000_brand_crm.sql` (`crm_deals`, `content_items.crm_deal_id`)
- **Depends on:** `workspaces`, `deals`, `brands`; used by `content` (deal association check)

## `approvals`
The human checkpoint: a member sends an item for approval (agents with API keys arrive in Phase 6); a signed-in person
approves (the item becomes Published — nothing is posted anywhere) or rejects with a reason.
- **Pages:** `/dashboard/[workspace]/approvals` → `ApprovalsPage.tsx` (pending cards, reject dialog, recent decisions)
- **API:** `GET /workspaces/{workspace}/approvals`, `POST /workspaces/{workspace}/approvals`, `POST …/approvals/{request_id}/approve`, `POST …/approvals/{request_id}/reject`
- **Backend:** `router.py`, `service.py` (`ApprovalService`: one pending request per item → 409, decisions are atomic — a request decided twice → 409), `models.py`, `repository.py`, `supabase_repository.py`
- **Database:** `supabase/migrations/20261115000000_calendar_and_approvals.sql` (`publish_requests`)
- **Depends on:** `workspaces`, `content` (`ContentService.get`, `mark_published`)

## `ai-assist`
AI help for a workspace, all fed by the workspace's AI knowledge: Generate Title / Description / Hook (wizard and item
editor), Generate outline (Scripts), and AI Content Suggestions (kept 24 h; Create adds one to the pipeline, Dismiss hides it).
- **Pages:** `/dashboard/[workspace]/ai-suggestions` → `AiSuggestionsPage.tsx`; `/dashboard/[workspace]/settings/ai-knowledge` → `AiKnowledgePage.tsx`
- **Frontend internals:** `components/GenerateButton.tsx` + `hooks/useGenerate.ts` (exported via `index.ts` for `content`), `ai-assist.module.css`
- **API:** `GET/PUT /workspaces/{workspace}/ai-knowledge`, `POST /workspaces/{workspace}/ai/generate`, `GET /workspaces/{workspace}/ai/suggestions`, `POST …/ai/suggestions/refresh`, `POST …/ai/suggestions/{suggestion_id}/dismiss`
- **Backend:** `router.py` (`get_llm`: Gemini when `GEMINI_API_KEY` is set), `service.py` (`AiAssistService`; 503 when AI is unavailable, 429 over the per-workspace rate limit), `rules.py` (prompts, clean-up, 24 h freshness, `RateLimiter`), `models.py`, `repository.py`, `supabase_repository.py`
- **Database:** `supabase/migrations/20261114000000_scripts_and_ai.sql` (`workspace_ai_knowledge`, `ai_suggestions`)
- **Depends on:** `workspaces`, `content`; `shared/llm` (`write`, `write_structured`)

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
| `backend/shared/llm/` (port + Gemini adapter) | contract-intelligence, contracts, ai-assist |
| `frontend/src/shared/lib/api-client.ts` (+ generated `api-types.ts`) | every page |
| `frontend/src/shared/lib/session.ts` | auth, app shell, most pages |
| `frontend/src/shared/lib/format-currency.ts`, `status-variants.ts` | deals, creators, analytics, contracts, contract-intelligence, payments |
| `frontend/src/shared/constants/deal-stages.ts` | deals, deliverables, creators, analytics |
| `frontend/src/shared/components/ui/` (`StatusPill`, `EmptyState`, `GradientPanel`) | most brand pages |
| `frontend/src/shared/components/ui/Dialog.tsx` (native `<dialog>` modal) | content (Add Content wizard), workspaces (⌘K palette) |
| `frontend/src/app/_shell/AppShell.tsx` | the `(brand)` layout (brand app only; creators are sent to `/dashboard`) |
