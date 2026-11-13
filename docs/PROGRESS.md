# Creator OS — Progress Log

> **Note (2026-11-09):** the code was reorganised into feature folders on the
> `refactor/feature-structure` branch. File paths in this log (`domain/`, `application/`,
> `infrastructure/`, `interface/`, `frontend/lib/`, `frontend/components/`, root-level
> `seed_demo.py`) describe the layout at the time and no longer exist. For the current layout see
> [ARCHITECTURE.md](ARCHITECTURE.md) and [FEATURES.md](FEATURES.md).

## ▶ Current work: creator workspace rebuild (branch `feature/creator-workspace`)

**Read this section first in every session.** Goal: rebuild the *creator* side as the workspace product in
"CreatorOS — Full Frontend Reference & Rebuild Spec" (Nov 9 2026), keeping today's colours and components; the
brand side stays as it is.

### Decisions (owner, 2026-11-13)
- Today's creator views (dashboard, board, negotiation, creator use of contracts/deliverables/payments/chat) are **dropped**.
- **No** social posting integrations (YouTube, LinkedIn, X, Instagram, Facebook) and **no** payment gateway.
- **Free for everyone (MVP), decided 2026-11-13:** no subscription, plan, trial or Billing page anywhere — not in the
  database, API, sidebar (no "Plan · Trial" row) or docs. The only limit is a fair-use cap of 3 owned workspaces per
  person (`features/workspaces/rules.py::MAX_WORKSPACES_PER_OWNER`).
- Google sign-in via Supabase Auth — owner will configure the Google OAuth client (steps given 2026-11-13).
- Migrations: Claude writes one SQL file per phase in `supabase/migrations/`; **the owner runs it** in the Supabase SQL editor.
  Until then features are built and tested on the demo dataset, then re-verified on the real database.
- Full team model: workspaces, members, roles (Owner, Script Writer, Video Editor, Brand Manager; 2 seats each), 11 permissions, audit log.
- One `.env` at the repo root for backend and frontend (`/.env.example`).
- **Brand link:** deals a brand creates on Creator OS with a creator appear as rows in that creator's Brand CRM
  (marked "via Creator OS") next to the creator's own CRM deals. Creator-facing brand features (creator replies in brand
  chat, creator deliverable/contract updates, invite-code linking) are removed with the old creator views.
- **Sign-in:** creators use Google *and* email/password (both Supabase Auth). Invited team members sign in the same way.
- **Theme:** today's light palette only — no dark mode, no theme toggle (Appearance keeps only the sidebar settings).
- **RLS:** live tables already have row-level security on with no public policies (verified 2026-11-13: the public anon
  key sees 0 rows of non-empty tables). Every new table must `enable row level security` with no policies; the backend
  uses the service-role key.

### Phases
| # | Phase | Status |
|---|---|---|
| 1 | Foundations: single .env ✅, security fixes ✅, workspace backend ✅ (verified on live DB), Google provider configured ✅ | done (Google button built in Phase 2) |
| 2 | New creator shell + content core: shell, Home, 5-step Add Content wizard, Content Pipeline kanban, Google sign-in, old creator views removed | done (verified on live DB) |
| 3 | Scripts + AI: Scripts editor, AI knowledge settings, AI Assistant suggestions, Generate Title/Description/Hook | done (verified on live DB + live Gemini) |
| 4 | Calendar + Approvals (publish state machine without platform posting) | done (verified on live DB) |
| 5 | Brand CRM (creator's own deals table, KPIs, New Deal wizard) | done — owner: run migration 005 **before deploying**, then live check |
| 6 | Workspace & team: members, invites, roles, permissions, audit log, API keys, webhooks | next |
| 7 | Notifications, Support, remaining Settings tabs (no Billing — the app is free) | pending |
| 8 | Hardening: 100-concurrent-user load test, full e2e, security review, docs | pending |


### Phase 1 notes (done)
1. ✅ (2026-11-13) Backend feature `features/workspaces/`: models (Workspace, WorkspaceMember, role Literal), repository port,
   supabase_repository, in-memory demo repo + seed one primary workspace per demo creator, rules (slug `ws-` + 8 hex,
   fair-use cap of 3 owned workspaces), service (ensure primary workspace for a creator — idempotent, race-safe via the
   unique index; list mine; resolve slug-or-uuid for a member; create within the cap), router `/workspaces`
   (GET list, GET {ref}, POST).
2. ✅ (2026-11-13) Identity: split `features/auth/dependencies.py` so a `get_current_user` (token → user id, demo tokens included)
   exists alongside `get_current_actor`; workspace routes use `require_workspace_member(ref)` → WorkspaceContext
   (user, workspace, role). Invited members have no creators/brands row, so they must not depend on get_current_actor.
3. Google sign-in (after the owner confirms the Supabase Google provider is configured): frontend
   `signInWithOAuth` → `/auth/callback` → backend endpoint that creates the creator profile for a new Google user.
4. Then Phase 2 (shell + Home + wizard + pipeline) — the old creator views are removed in Phase 2, in the same change that
   replaces them, so creator login always lands on a working page.

### Phase 2 (done, 2026-11-13)
Backend
1. ✅ Migration 002 `content_items` (workspace-scoped; RLS on): title, description, type (long_form_video | post | reel |
   story | short_form_video), pillar, hook, target_platforms text[] (youtube | instagram | x | linkedin | facebook —
   planning tags only, no posting), due_date, assignee_user_id, stage (idea | scripted | in_production | scheduled |
   published), created_by, timestamps. Owner runs it.
2. ✅ Feature `content`: model/rules/port/Supabase + demo repos/service; router under `/workspaces/{workspace}/content`
   (GET list, POST create, PATCH update incl. stage move, GET stats for Home KPIs) — every route uses
   `require_workspace_member`. `GET /workspaces/{workspace}/members` for the wizard's "Assign To".
3. ✅ Google sign-in completion: `POST /auth/creator/oauth` creates the creator profile for a new Supabase (Google) user.
4. ✅ Remove backend code used only by the dropped creator views (negotiation, benchmarks, growth snapshots,
   `/creators/me*`, deal stats/weekly value, personal contracts, creator contract status, upload-sample), after grepping
   the brand frontend for any use. Keep `deals.list_for_creator` (Brand CRM, Phase 5).
Frontend
5. ✅ Remove old creator pages (`/creator`, `/creator/board`, `/creator/negotiate/[dealId]`) and their features;
   creator login → `/dashboard/<slug>`.
6. ✅ Workspace shell at `src/app/dashboard/[workspace]/` (today's colours): sidebar groups (only built pages listed),
   workspace switcher, user menu (Sign out), top bar (sidebar toggle, ⌘K palette with quick actions), page header
   component; custom 404.
7. ✅ Home (KPIs, Recent Content, content-by-platform card instead of followers — no connections, quick actions),
   onboarding banner; Content Pipeline (empty state + 3 step cards, Filters panel, kanban with drag-and-drop between
   stages); 5-step Add Content wizard (deal association arrives in Phase 5, AI generate buttons in Phase 3).
8. ✅ Google button on creator login/signup + `/auth/callback`.
Verify: backend tests, API contract, e2e for every new page/flow, real-DB check after migration 002.

Phase 2 notes
- **Owner actions pending:** (1) run `supabase/migrations/20261113010000_content_items.sql` in the SQL editor (the two
  `drop column` lines of migration 001 too, if not done); (2) Supabase → Authentication → URL Configuration → Redirect
  URLs: add `http://localhost:3000/auth/callback` and `https://ucs-503-p-202627-creator-os.vercel.app/auth/callback`;
  (3) Vercel env must have `NEXT_PUBLIC_SUPABASE_URL` (the Google button needs it). Then: live check of content CRUD +
  a real Google sign-in.
- Google sign-in uses the Supabase authorize redirect + URL-fragment tokens — no Supabase JS SDK added.
- Creator branches left in shared brand pages (chat creator list, deliverable/payment creator views) are unreachable
  now that creators are redirected to `/dashboard`; Phase 5 (Brand CRM) decides whether creators get deal pages back —
  delete or reuse them then.
- Unused DB tables after the cleanup: `negotiation_sessions`, `negotiation_offers`, `negotiation_conversations`,
  `growth_snapshots` (and benchmark data read from deals). Not dropped — ask the owner before writing a drop migration.
- Known gaps by design: no theme toggle (light only), no bell / Notifications (Phase 7), no Publish button (no posting),
  Deal Association in the wizard arrives with Brand CRM (Phase 5), AI Generate buttons in Phase 3.

### Phase 3 (done, 2026-11-14)
Backend
1. ✅ Migration 003: `content_scripts` (content_item_id PK → content_items on delete cascade, body text ≤ 50k, updated_by,
   timestamps), `workspace_ai_knowledge` (workspace_id PK: brand, audience, strategy, custom_output_format, ≤ 4k each),
   `ai_suggestions` (workspace_id, suggestions jsonb, generated_at, dismissed ids) — RLS on, no policies.
2. ✅ Scripts (built inside `features/content` — a script always belongs to an item): `GET/PUT /workspaces/{ws}/content/{item}/script` (auto-save; first non-empty save moves an
   `idea` item to `scripted`; `content.rules.is_scripted` becomes "has a script"), `POST …/script/outline` (Gemini).
3. ✅ `features/ai_assist`: `GET/PUT /workspaces/{ws}/ai-knowledge`; `POST /workspaces/{ws}/ai/generate`
   (field = title | description | hook, from the draft + knowledge); `GET /workspaces/{ws}/ai/suggestions` (24 h cache),
   `POST …/suggestions/refresh`, `POST …/suggestions/{id}/dismiss`, create-from-suggestion via the content API.
   Add LLM port methods in `shared/llm`; 503 "temporarily unavailable" without a Gemini key (as contract-intelligence);
   per-workspace rate limit on AI calls (100-user target).
Frontend
4. ✅ Sidebar "Create" group: Scripts (`/scripts`: two panes — item list + editor with debounced auto-save and Generate
   outline) and AI Assistant (`/ai-suggestions`: 3 info cards, suggestions card, tips card).
5. ✅ Settings shell with the AI knowledge tab only (`/settings/ai-knowledge`); other tabs arrive in Phases 6–7.
6. ✅ Wizard + board: Generate Title / Description / Hook buttons; clicking a card opens an item editor (edit fields,
   inline generate, link to its script).
Verify: unit tests for rules, API tests with a fake LLM, cross-workspace 403/404 tests, e2e for Scripts/AI pages.

Phase 3 notes
- **Owner actions pending:** (1) run `supabase/migrations/20261114000000_scripts_and_ai.sql`; (2) the `GEMINI_API_KEY`
  in the root `.env` is rejected by Google (401 "API key not valid" — it is not an AI Studio API key). Create one at
  https://aistudio.google.com/apikey, put it in the root `.env` and in the deployed backend's env. Until then every AI
  button answers "AI is temporarily unavailable" (503) and the rest of the app works.
- Rate limit: 30 AI calls per workspace per 10 minutes, in process memory (`ai_assist/rules.py::RateLimiter`) — move to
  Redis/DB if the API runs on several instances (Phase 8).
- AI success paths are tested with a fake LLM (`tests/features/ai_assist/test_ai_assist_api.py`); e2e checks the
  "unavailable" path because the e2e backend has no key.

### Phase 4 (done, 2026-11-15)
Read spec §4.3 Calendar (`/schedule`) and §4.4 Approvals (`/approvals`) in the Rebuild Spec PDF first.
Backend
1. ✅ Migration 004: `scheduled_at timestamptz` on `content_items` (+ index); `publish_requests` (workspace_id,
   content_item_id, requested_by, source human|agent, status pending|approved|rejected|published, reason, decided_by,
   timestamps) — RLS on.
2. ✅ content: schedule/unschedule an item (sets `scheduled_at`, moves it to Scheduled); list by date range for the calendar.
3. ✅ `features/approvals`: create a publish request, list pending, approve / reject with a reason; approving marks the item
   Published (no platform posting — "publish" means the creator confirms it went live). Agents (API keys) arrive in Phase 6.
Frontend
4. ✅ Calendar page (month/week grid, day cell → Add Content wizard with that date, "Schedule Post" button, drag an item to
   a day); Approvals page (pending list, approve/reject dialog, empty state "Nothing waiting").
5. ✅ Sidebar Plan group: Calendar, Approvals; ⌘K "Schedule Content".
Verify: rules/service/API tests (cross-workspace 403/404), e2e for both pages, live DB check after migration 004.
Phase 4 notes
- **Deploy order:** run `supabase/migrations/20261115000000_calendar_and_approvals.sql` BEFORE deploying this backend —
  the new `scheduled_at`/`published_at` fields make content inserts fail on a database without those columns.
- Requests are created by people for now ("Request approval" in the item editor); Phase 6 adds agent requests
  (`source='agent'`, `agent_name`) and role rules for who may decide.
- The feed has no "Native (Graph)" source or Engaged sort: there are no platform connections.

### Phase 5 (done, 2026-11-16)
Read spec §4.8 Brand CRM (`/crm`) and workflow 5 ("New Deal → content") in the Rebuild Spec PDF first.
Owner decision already made: brand deals made on Creator OS with this creator show in the CRM.
Backend
1. ✅ Migration 005: `crm_deals` (workspace_id, contact name/company/email, deal size, currency, status prospect|pending|
   negotiating|signed|active|completed|lost, priority, start/end/next-follow-up dates, notes, deliverables text,
   created_by, timestamps) — RLS on; `content_items.crm_deal_id` (nullable FK) for the wizard's Deal Association.
2. ✅ `features/crm`: CRUD + KPIs (pipeline value, active, won, follow-ups due); a read-only list of Creator OS brand
   deals for the workspace's creator (`deals.list_for_creator` via `workspaces.creator_id`) merged into the CRM table
   (marked "On Creator OS").
3. ✅ Content: optional `crm_deal_id` on create/update, validated to the same workspace.
Frontend
4. ✅ Brand CRM page (KPI cards, filters, deals table, status pills), 4-step New Deal wizard (Contact, Deal, Timeline &
   Notes, Content — "Create a content item for this deal"), deal drawer/edit.
5. ✅ Wizard step 4 Deal Association search; sidebar "Monetize › Brand CRM"; ⌘K "Manage Brands".
6. ✅ Decide (with the owner) what happens to the unreachable creator branches in the shared brand deal pages.
Verify: rules/service/API tests (cross-workspace), e2e for CRM + deal association, live DB after migration 005.
Phase 5 notes
- **Deploy order:** run `supabase/migrations/20261116000000_brand_crm.sql` BEFORE deploying this backend (content
  inserts write `crm_deal_id`).
- One status vocabulary everywhere (the spec mixed Lead/Prospect/Closed/Urgent): prospect, pending, negotiating,
  signed, active, completed, paid, cancelled; Closed = completed + paid; priorities low/medium/high.
- Total Value is shown per currency; there is no FX conversion.
- Item 6: creator-only branches removed from chat, contracts, deliverables and payments (commit `e49effc`).
  **Kept pending an owner decision:** the creator "Flagged Clauses Review" view in
  `features/contract-intelligence/ClauseReviewPage.tsx` — it is the only UI that shows red-flag clause scanning, and
  creators can no longer reach it. Options: show it to brands, move it into the creator workspace, or delete it.
- `AppShell` renders brand pages only once the session is known not to be a creator's (a creator opening `/chat` used
  to fire brand-only API calls before the redirect).
- Skipped from the spec table: bulk-select checkboxes and the column-visibility toggle.

### Phase 6 plan — pick up here (Workspace & team)
Read spec §4.12 Settings (Workspace, Members, Roles, API keys, Webhooks, Audit log) and workflows 5.3–5.5 first.
Backend
1. Migration 006: `workspace_invites` (email, role, token hash, expires, accepted_at), `api_keys` (name, prefix,
   hash, scopes, approval_required, last_used_at, revoked_at), `webhooks` (url, secret, events, active),
   `audit_log` (actor, action, target, allowed/denied, at) — RLS on.
2. Members: invite by email (Resend), accept link → membership (invited users have no creator profile; they use
   `get_current_user_id`), change role, remove; owner can't be removed; 2 seats per role (spec).
3. Roles → permissions map in `workspaces/rules.py` (owner all; script_writer: content + scripts; video_editor:
   content + calendar; brand_manager: CRM + approvals); enforce with a `require_permission(...)` dependency on every
   workspace route; hide sidebar items the role can't open.
4. API keys (hashed, shown once) with scopes; agent requests create publish requests with `source='agent'`; no key can
   approve. Webhooks with HMAC-signed payloads for content.stage_changed, publish.* events; audit log writes.
Frontend
5. Settings tabs: Workspace (rename), Members, Roles, API keys, Webhooks, Audit log; invite accept page.
Verify: permission matrix tests per role and endpoint, invite flow e2e, live DB after migration 006.
### Phase log
- **2026-11-16 — Phase 5 (Brand CRM)**: migration 005; `features/crm` (CRUD, KPIs per currency, pipeline overview,
  top brands, follow-ups due, read-only Creator OS brand deals); content `crm_deal_id` (same-workspace only); CRM page
  (KPIs, filter panel, sortable table, paging, CSV export, Pipeline & Insights, On Creator OS), 4-step Create/Edit
  Deal wizard with linked content item, Deal Association in the Add Content wizard, sidebar Monetize, ⌘K Manage
  Brands. Brand pages: creator-only branches removed; AppShell gates rendering. A parallel cleanup's staged deletions
  slipped into `25e7b78` and were restored in `0f20717`. Checks: 171 backend tests, contracts kept, mypy 113,
  tsc/eslint/prettier, build, smoke 26/26, e2e 7/7. Phase 4 verified live (incl. simultaneous approve/reject → one wins).
- **2026-11-15 — Phase 4 (Calendar + Approvals)**: migration 004; content `scheduled_at`/`published_at` with
  `apply_stage_rules`; `features/approvals` (request, approve → Published, reject with reason, one pending per item,
  atomic decisions); Calendar (week/month, day → wizard with due date, chips, feed with platform/range/search) and
  Approvals pages; editor gets "Scheduled for" and "Request approval". Checks: 161 backend tests, contracts kept,
  mypy 113, tsc/eslint/prettier, build, smoke 25/25, e2e 6/6.
- **2026-11-15 — Phase 3 verified live + Gemini resilience**: migration 003 on the live DB (scripts save, idea →
  Scripted, KPI, knowledge); live Gemini: hook, 2.1k-char outline, 6 suggestions, 24 h cache, dismiss, stranger 403.
  The configured `gemini-3.8-flash` was returning 503/504 under load → adapter now caps calls at 15 s and falls back
  to `GEMINI_MODEL_FALLBACK` (default `gemini-flash-lite-latest`, ~2 s). Commit `0fbae22`.
- **2026-11-14 — Phase 3 (Scripts + AI)**: migration 003; scripts with 1 s debounced auto-save (first script → Scripted;
  Scripted KPI counts scripts); `features/ai_assist` (AI knowledge, Generate title/description/hook/outline, 24 h
  suggestions with Create/Dismiss, 503 when AI is unavailable, 429 per-workspace limit); frontend Scripts page, AI
  Suggestions page, Settings › AI knowledge, Generate buttons in the wizard and the new item editor (click a card),
  sidebar Create/Workspace groups, ⌘K actions. Checks: 151 backend tests, import contracts kept, mypy 113 (no new),
  tsc/eslint/prettier clean, build, route smoke 23/23, e2e 5/5. Live: migration 002 + content API verified on the
  real DB (create/move/stats, stranger 403, bad assignee 400, cleanup ok); Gemini key found invalid (see notes).
- **2026-11-13 — Phase 2 frontend**: workspace shell (`features/workspaces`: sidebar with switcher/new workspace/user menu,
  collapsible, ⌘K palette, `PageHeader`), Home and Content Pipeline (`features/content`: KPIs, content by platform,
  recent content, onboarding banner, kanban with drag-and-drop + "Move to" menu, filters, 5-step wizard), `/dashboard`
  redirect, Google button + `/auth/callback`, custom 404, native `<dialog>` modal (`shared/components/ui/Dialog`).
  Removed old creator pages (`/creator`, `/creator/board`, `/creator/negotiate/[dealId]`), creator-only contract
  actions, `GrowthTracker`; brand `AppShell` now brand-only. API types regenerated. Checks: tsc, eslint (2 older
  warnings), prettier, build, route smoke 20/20, e2e 4/4 (new creator flow: wizard, KPIs, ⌘K, drag-and-drop,
  filters, id→slug, no-access state, sign-out, 404). Screens checked at 1280 px and 390 px.
- **2026-11-13 — dead creator-only backend removed**: negotiation + benchmarks features, growth snapshots,
  `PATCH /creators/me`, deal stats/weekly value, personal contract uploads, creator contract status, negotiation LLM
  prompts, `shared/money.py`. Kept `/creators/me/brands` and `/creators/me/link-brand`. 133 backend tests; mypy
  131 → 113 errors (older baseline, CI runs pytest only). Commit `0031e92`.
- **2026-11-13 — Google sign-in completion (Phase 2, item 3)**: `POST /auth/creator/oauth` (Bearer = Supabase access token from the Google redirect, body = refresh token) returns the usual `AuthSession`; first call creates the creator profile from the Google name, later calls reuse it; brand accounts are refused. Live check: 2 temporary users → 1 profile each, repeat call idempotent, primary workspace created, anonymous 401, cleanup ok. 171 backend tests.
- **2026-11-13 — content backend (Phase 2, items 1–2)**: migration 002 `content_items` written (`supabase/migrations/20261113010000_content_items.sql`, **owner must run it**); feature `features/content` (models, rules incl. 30-day KPI deltas, port, Supabase + demo repos, service, router `/workspaces/{workspace}/content` GET/POST/PATCH + `/stats`); `GET /workspaces/{workspace}/members` (names via `UserDirectory`). Assignee must be a member; items from another workspace → 404; non-members → 403. 169 backend tests; no new ruff/mypy errors (older baseline errors in seed/demo code remain — CI runs pytest only).
- **2026-11-13 — single .env**: root `.env` (backend + `NEXT_PUBLIC_*`); backend loads it by absolute path
  (`shared/config.py`), Next loads it in `next.config.ts`; CI sets dummy demo-mode env. Commit `11bbdea`.
- **2026-11-13 — Phase 1 verified on live DB**: migration 001 applied by owner (leftover `plan`/`trial_ends_at` columns
  from the first draft — owner asked to run the two `drop column` lines; harmless meanwhile). Live check with a temporary
  user: 10 concurrent first requests → 1 primary workspace; slug/id access; stranger refused; cap of 3; cleanup ok.
  Google + email providers enabled in Supabase. Root `.env`: two owner-added lines fixed (leading spaces, invalid key
  names → `GOOGLE_OAUTH_CLIENT_SECRET` / `GOOGLE_OAUTH_CLIENT_ID`; unused by the app).
- **2026-11-13 — free for everyone**: removed plan/trial from migration 001 (with `drop column if exists` in case the
  draft was applied), the Workspace model, service and tests; slot limit renamed to a fair-use cap. Billing dropped from the plan.
- **2026-11-13 — workspaces backend**: `features/workspaces` (models, rules, port, Supabase + demo repos, service, router `GET/POST /workspaces`, `GET /workspaces/{workspace}`), `get_current_user_id` (identity without a brand/creator profile, cached), `require_workspace_member` (slug or id; 404 unknown, 403 non-member), `DuplicateError` for race-safe primary-workspace creation. 157 backend tests. Commit `65a99b6`.
- **2026-11-13 — migration 001 written** (`supabase/migrations/20261113000000_creator_workspaces.sql`: `workspaces`,
  `workspace_members`, RLS on). **Owner must run it** before the real-database check of Phase 1.
- **2026-11-13 — security**: demo accounts only in offline demo mode outside production, demo password required, raw
  user-id tokens rejected; 10 public endpoints now require a session; one access rule (`deals.can_access_deal` via
  `load_accessible_deal` / `load_accessible_contract`) closes cross-brand IDORs on contracts, deliverables, payments,
  negotiation sessions, escalations. 146 backend tests incl. cross-tenant 403 tests; e2e 3/3. Commit `2f078ca`.

> This file was rewritten end-to-end to reflect the actual live application
> (`backend/` + `frontend/`, FastAPI + Supabase + Next.js). The prior version
> of this file documented a different, since-deleted NestJS/Prisma/Docker
> stack (`apps/api` + `apps/web`) that is no longer part of this project —
> those folders remain in the repo as historical leftovers only.

---

## Tech Stack

| Layer            | Technology                                    | Notes                                                                 |
| ----------------- | ---------------------------------------------- | ----------------------------------------------------------------------- |
| Frontend          | Next.js 16 (App Router, Turbopack)            | TypeScript, no Tailwind — hand-written CSS custom-property design tokens |
| Backend           | FastAPI (Python 3.13)                         | Hexagonal / ports-and-adapters architecture                             |
| Database & Auth   | Supabase (Postgres + GoTrue Auth)             | Accessed via `supabase-py`, service-role client for backend writes      |
| AI                | Google Gemini (`gemini-*-flash`)              | Contract clause scanning, negotiation chat, script drafting — both AI paths now on Flash (switched off Pro for quota headroom) |
| Transactional email | Resend                                       | Invite/notification emails                                              |
| Backend package mgmt | `uv`                                        | Lockfile-based, `uv.lock` committed                                     |
| Frontend package mgmt | `npm`                                       | `package-lock.json` committed                                           |
| API typing bridge | `openapi-typescript`                          | Generates `frontend/lib/api-types.ts` from the FastAPI OpenAPI schema — the frontend never hand-writes API types |
| API client        | `openapi-fetch`                               | Typed fetch wrapper (`frontend/lib/api.ts`) built on the generated types |
| Backend tests     | `pytest` + `pytest-asyncio`                   | Unit tests against fakes, integration tests against the FastAPI app     |
| Frontend checks   | `tsc --noEmit`, `eslint`                      | No frontend test framework configured                                   |
| Target deploy     | Vercel (frontend) + Render (backend)          | Guide written; not yet live as of this entry                            |

---

## Architecture

### Backend — hexagonal (ports & adapters)

```
backend/
├── domain/                    # Pure business logic — zero I/O, fully unit-testable
│   ├── models/                  # Pydantic models: Deal, Contract, Payment, Deliverable,
│   │                             # NegotiationSession/Offer/Conversation, Message,
│   │                             # GrowthSnapshot, Creator, Brand, ActivityLog, ...
│   ├── logic/                   # Pure functions:
│   │                             #   negotiation.py — calculate_base_rate/range/forecast
│   │                             #   money.py — format_inr() (Indian digit grouping)
│   │                             #   growth.py — estimate_weekly_growth_rate()
│   │                             #   transitions.py — contract/deliverable status state machines
│   └── interfaces/              # Repository protocols (the "ports")
├── application/
│   └── services/                # Use-case orchestration: DealService, ContractService,
│                                 # PaymentService, DeliverableService, NegotiationService,
│                                 # CreatorService, AuthService, MessageService, ...
├── infrastructure/              # Adapters (the "ports" implemented)
│   ├── supabase/                  # SupabaseXRepo implementations + client.py
│   │                               # (lru_cache'd client by default; fresh=True for any
│   │                               #  call that mutates auth session state)
│   ├── llm/gemini_adapter.py      # GeminiAdapter — clause segmentation, negotiation chat,
│   │                               # script drafting (Google Search grounding on the chat path)
│   ├── email/resend_adapter.py
│   └── pdf/                       # Contract text extraction
├── interface/
│   ├── routers/                 # FastAPI routers — one per resource (auth, deals,
│   │                             # contracts, deliverables, payments, negotiation,
│   │                             # messages, creators, activity_log, analytics, benchmarks)
│   └── dependencies.py          # get_current_actor/get_current_brand — JWT → ActorContext,
│                                 # with a 30s in-memory cache to avoid re-resolving identity
│                                 # on every request in a page load
├── tests/
│   ├── unit/                    # Service/domain-logic tests against fakes
│   ├── integration/              # Full-app tests via FastAPI's TestClient
│   └── fakes/fake_repos.py       # In-memory repo doubles implementing the domain interfaces
├── seed_demo.py                 # Builds a full realistic demo dataset from scratch
├── reset_demo.py                # Wipes all demo/test data (preserves any real accounts)
└── main.py                      # FastAPI app, CORS (FRONTEND_URL env var), router registration
```

Every blocking Supabase call is wrapped in `asyncio.to_thread()` (see Milestone 6) — the
`supabase-py` client is synchronous, and without that wrapping every request serialized
behind the event loop instead of running concurrently.

### Frontend — Next.js App Router

```
frontend/
├── app/
│   ├── (auth)/                  # brand/creator login & signup — each login page lists
│   │                             # every demo account as a ready-to-click quick-login button
│   ├── (brand)/                 # Route group name is historical — pages here are SHARED
│   │   │                        # between both roles via `isBrand` branching, not brand-only:
│   │   ├── brand/                  # brand's deal list / dashboard
│   │   ├── contracts/               # shared: brand sees Creator/Contract/Reviewed/Accept;
│   │   │                            # creator sees their own full contract detail
│   │   ├── deliverables/            # shared: creator drives production status,
│   │   │                            # brand only approves/rejects/requests revision
│   │   ├── payments/                # shared: binary paid/not-paid, deliverable-linked invoices
│   │   ├── deals/[id]/              # brand's deal detail (contracts, deliverables, payments —
│   │   │                            # no negotiation UI, that lives on the creator's own page)
│   │   ├── creators/[id]/           # brand's view of one creator: embedded chat, contracts
│   │   ├── chat/                    # shared brand<->creator direct-message hub (polling)
│   │   ├── analytics/, activity/
│   └── (creator)/
│       ├── creator/                 # creator Dashboard: profile, linked brands, deals table,
│       │                            # growth tracker, contracts, niche benchmarks —
│       │                            # NO rate calculator or AI chat here anymore
│       ├── creator/board/            # Kanban deal-stage board
│       └── creator/negotiate/[dealId]/  # per-deal negotiation workspace: rate calculator,
│                                        # suggested range + why-this-rate breakdown,
│                                        # forecast chart, pre-send checklist, AI chat + history
├── components/
│   ├── AppShell.tsx, StatusPill.tsx, EmptyState.tsx, ...
│   └── creator/                     # ForecastChart, RateCalculatorForm, NegotiationChat,
│                                     # GrowthTracker, DealsTable — split out of the old
│                                     # monolithic /creator page into single-purpose components
└── lib/
    ├── api.ts                       # typed client (openapi-fetch + generated types)
    ├── api-types.ts                 # generated — never hand-edited
    └── auth.ts                      # localStorage session read/write
```

### Key design decisions

- **Hexagonal architecture**: `domain/` has no imports from `infrastructure/` or `interface/` —
  every domain function is testable with plain Python objects, no mocks of Supabase needed.
- **Shared-page pattern**: contracts/deliverables/payments/chat are each *one* route serving
  both roles, branching on `loadSession()?.role`, rather than duplicated brand/creator pages.
- **Money is always ₹, Indian digit grouping** (`₹5,46,000`, not `₹546,000`) via `format_inr()`.
- **Role-gated status transitions are enforced server-side**, not just hidden in the UI — e.g.
  a creator cannot approve their own deliverable, a brand cannot advance production status,
  even by calling the API directly.

---

## Timeline

### Source recovery

The original `backend/`/`frontend/` source was found deleted from disk mid-session and
restored from a GitHub backup (`Bhuvan7888/AI-Content-Manager`). This is also where a
committed `backend/.env` was first discovered — see Security remediation below.

### Change-request feature build-out

Implemented the creator-side and brand-side gaps from the original change-request audit,
with matching Supabase migrations:

- `deals.brand_id` made nullable (creators can log their own unlinked projects)
- `deals.value_inr`, `deals.brand_viewed_at`
- `contracts.creator_status`
- `payments.platform_fee_inr`, later `payments.deliverable_id`
- `brands.description`
- New tables: `growth_snapshots`, `negotiation_conversations`, `messages`
- Later: `deliverables.contract_id` (link a deliverable to the contract it was scoped under)

### Negotiation feature overhaul

- Negotiation scripts switched from hardcoded `$` to real `₹` formatting via `format_inr()`.
- **Fixed a real rate-calculator bug**: `calculate_base_rate()` multiplied the full weekly
  view count directly by the niche CPM instead of dividing by 1,000 first — CPM means
  *cost per thousand views*. Every calculated rate was inflated ~1000x (a realistic
  ₹9,720 base rate was showing as upwards of ₹7–26 lakh). Fixed the formula, updated the
  unit test, and recomputed every seeded demo negotiation to match.
- Added the AI negotiation chat: Gemini-backed, persistent conversation history, brand
  auto-identification via Google Search grounding, multi-turn context, graceful 503 on
  quota exhaustion instead of a crash.
- Split the single, increasingly cluttered `/creator` page into a general **Dashboard**
  (`/creator`) and a dedicated per-deal **Negotiation workspace**
  (`/creator/negotiate/[dealId]`) with its own componentized rate calculator, forecast
  chart, checklist, and chat.
- Rebuilt the forecast chart from a bare unlabeled polyline into a real interactive band
  chart: proper nice-number axis scaling (was wasting up to two-thirds of the chart height
  on a fixed 0-based scale), real calendar-date x-axis, pointer/touch crosshair + tooltip
  with tap-to-pin, and a dashed reference band showing today's suggested range.
- The negotiate page now shows the creator's current follower count, engagement rate, and
  every rate-calculator input (views/week, CPM, tier multiplier, engagement adjustment)
  right next to the suggested range, so the number is explainable, not just asserted.

### Messaging

- Added direct brand↔creator messaging (distinct from the AI negotiation chat), with a
  shared `/chat` hub page, replacing the old brand-only "Negotiate" nav item.
- Brand's creator-detail page gained an embedded chat thread and a contracts list with
  upload timestamps.

### Contracts / Deliverables / Payments restructuring

- **Contracts**: brand's view simplified to Creator / Contract / Reviewed / Accept; the
  accept flow moves the deal to `in_production` and surfaces a clean error instead of
  corrupting deal state when a contract is stuck in `pending_review`.
- **Deliverables**: production-status control (advance to in-progress/editing/submitted)
  moved from the brand to the creator — enforced in the API, not just the UI, so a brand
  can't set it via a raw request either; the brand keeps only approve / reject / request
  revision. Deliverables can now optionally reference the contract they were scoped under.
- **Payments**: simplified from a three-way pending/paid/overdue selector to a binary
  paid / not-paid state; invoices can attach a specific deliverable.
- Contract-risk and negotiation-outcome analytics moved to creator-only (removed from the
  brand's analytics view, since negotiation is off-platform from the brand's side now).

### Backend concurrency fix

Diagnosed and fixed a systemic issue: every Supabase call across ~14 files (67+ call
sites) was declared inside `async def` but was actually synchronous — each one froze
FastAPI's single-threaded event loop for the full round-trip, so concurrent requests
queued instead of overlapping. A single page load firing 3+ API calls could take 5–10
seconds. Wrapped every blocking call in `asyncio.to_thread()`; verified with a
concurrent-burst test that requests genuinely overlap afterward.

### Fresh demo data

Wiped all demo/test accounts (preserving the one real personal account found mixed in
with the test data) and rebuilt from scratch:

- **3 real-brand demo accounts**: Mamaearth, boAt, Nykaa
- **5 creator accounts** across beauty/fitness/fashion/tech/travel niches, one linked to
  two brands to demonstrate the multi-brand feature
- **13 deals** spanning every status (lead → negotiating → contracted → in_production →
  completed / cancelled)
- **6 contracts** (3 scanned through the real Gemini clause-scan pipeline, 3 simple)
- **6 deliverables** across every production/review stage
- **6 payments/invoices**, mixed paid and unpaid (including one overdue)
- **9 negotiation sessions** with realistic forecasts, seeded AI chat history, and
  growth-snapshot history per creator
- Login pages updated to list every demo account as a ready-to-click quick-login button

Found and fixed two real bugs in the seed script along the way: a Supabase client helper
that claimed to return a fresh client per call but didn't, silently poisoning every
signup after the first; and two service calls still passing an argument an earlier
API change had removed.

### Security remediation

- Confirmed `backend/.env` (Supabase service role key, Gemini API key, Resend key) was
  committed to git history, reachable from three remotes across two GitHub accounts.
- Scrubbed the file from history on the two repos the user owns, using `git filter-repo`,
  with a full pre-rewrite backup bundle and independent post-push verification via fresh
  clones. A third remote (owned by a different account) was deliberately left untouched.
- **Rotating the actual key values is still the user's own action item** — it requires
  dashboard access to Supabase / Google AI Studio / Resend that this session doesn't have.

### Deployment prep

Wrote a step-by-step Vercel (frontend) + Render (backend) deployment guide tailored to
this exact project — `main.py` already reads an optional `FRONTEND_URL` env var for CORS,
so no code change is needed there; Render needs its start command overridden to bind
`$PORT` instead of the hardcoded `8000` in `main.py`'s `main()`. Not yet deployed.

---

## Current status

- Backend: 72 tests passing (1 skipped), typecheck/lint clean.
- Frontend: `tsc --noEmit` clean, lint clean.
- Demo data: seeded and verified end-to-end via direct API calls for both a brand and a
  creator account (deals, contracts, payments, forecast, growth history, AI chat, messages).
- Outstanding: rotate the leaked API keys (user action), then deploy per the Vercel/Render guide.
