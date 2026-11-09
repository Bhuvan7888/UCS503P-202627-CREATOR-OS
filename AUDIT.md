# Creator OS — Codebase Audit & Restructure Proposal

Branch: `refactor/feature-structure` · Base commit: `098ea64` · Date: 2026-11-09
Baseline check results: see `REFACTOR_BASELINE.md`. **No application code has been changed yet.** This document is the input for Checkpoint 1.

---

## 1.1 Feature inventory

Feature names are kebab-case and are used the same way in docs, the frontend, and tests. Python packages can't contain hyphens, so the backend uses the snake_case form (`contract-intelligence` → `contract_intelligence`). API URLs are **unchanged**.

| Feature | What it does for the user | Frontend files (today) | Backend files (today) | Entry points | Depends on |
|---|---|---|---|---|---|
| `landing` | Public marketing page with role-based login/sign-up links | `app/page.tsx`, `app/landing.module.css` | — | `/` | shared `GradientPanel` |
| `auth` | Brand & creator sign-up / login, session storage, demo accounts, request identity (`ActorContext`) | `app/(auth)/layout.tsx`, `app/(auth)/auth.module.css`, `app/(auth)/brand/login/page.tsx`, `app/(auth)/brand/signup/page.tsx`, `app/(auth)/creator/login/page.tsx`, `app/(auth)/creator/signup/page.tsx`, `lib/auth.ts` | `interface/routers/auth.py`, `application/services/auth.py`, `domain/models/auth.py`, `interface/dependencies.py`, `domain/logic/tokens.py` (unused, see 1.2) · tests: `unit/test_auth.py`, `unit/test_tokens.py`, `integration/test_rls_role_matrix.py` | `/brand/login`, `/brand/signup`, `/creator/login`, `/creator/signup`; `POST /auth/{brand,creator}/{signup,login}` | `brands`, `creators`, `demo-mode` |
| `brands` | Brand accounts and brand membership (data only, no endpoints of its own) | — | `domain/models/brand.py`, `SupabaseBrandRepo`/`SupabaseBrandMemberRepo` in `infrastructure/supabase/repos.py` | — (used by auth, creators) | — |
| `creators` | Brand's creator roster, creator profile view, creator self-profile, link-to-brand, growth snapshots | `app/(brand)/creators/[id]/page.tsx`, `components/creator/GrowthTracker.tsx` | `interface/routers/creators.py`, `application/services/creators.py`, `domain/models/creator.py`, Creator/GrowthSnapshot repos in `repos.py` | `/creators/[id]`; `POST/GET /creators`, `GET /creators/{id}`, `PATCH /creators/me`, `GET /creators/me/brands`, `POST /creators/me/link-brand`, `POST/GET /creators/me/growth-snapshots` | `auth`, `brands`, `activity-log` |
| `creator-dashboard` | Creator home: stats, deals table, linked brands, contracts, benchmarks, growth tracker (composition page) | `app/(creator)/creator/page.tsx`, `components/creator/DealsTable.tsx` | — (calls deals, creators, contracts, benchmarks APIs) | `/creator` | `deals`, `creators`, `contracts`, `benchmarks` |
| `deals` | Brand deal pipeline + creator onboarding form, deal detail workspace, creator Kanban board, deal stats/weekly value | `app/(brand)/brand/page.tsx`, `app/(brand)/deals/[id]/page.tsx`, `app/(creator)/creator/board/page.tsx` | `interface/routers/deals.py`, `application/services/deals.py`, `domain/models/deal.py`, Deal repo in `repos.py` · tests: `unit/test_deals.py` | `/brand`, `/deals/[id]`, `/creator/board`; `POST/GET /deals`, `GET /deals/stats`, `POST /deals/{id}/view`, `GET /deals/weekly-value`, `PATCH /deals/{id}/status` | `auth`, `creators`, `activity-log` |
| `contracts` | Contract upload (brand & personal), status lifecycle, sample contract PDF + 1-click sample | `app/(brand)/contracts/page.tsx` | `interface/routers/contracts.py`, `application/services/contracts.py`, `domain/models/contract.py`, contract rules in `domain/logic/transitions.py`, `infrastructure/pdf.py`, `infrastructure/supabase/storage.py`, Contract repo in `repos.py` | `/contracts`; `GET /contracts/sample-contract-pdf`, `POST /contracts/upload-sample`, `POST /deals/{deal_id}/contracts`, `POST /creators/me/contracts`, `GET /contracts`, `GET /contracts/{id}`, `PATCH /contracts/{id}/creator-status`, `PATCH /contracts/{id}/status` | `auth`, `deals`, `contract-intelligence` (scan on upload), `activity-log` |
| `contract-intelligence` | Rule-based red-flag clause scanning, LLM clause explanations, escalations & resolution, clause review screen | `app/(brand)/contracts/[id]/clauses/page.tsx`, `components/ClauseCard.tsx` | `interface/routers/contract_intelligence.py`, `application/services/contract_intelligence.py`, `application/services/clause_explanation.py`, `domain/models/contract_intelligence.py`, `domain/logic/red_flag_engine.py`, `domain/logic/escalation.py`, `domain/interfaces/email.py`, `infrastructure/email/resend_adapter.py`, `infrastructure/supabase/contract_intelligence_repos.py` · tests: `unit/test_contract_intelligence.py`, `unit/test_clause_explanation.py`, `unit/test_red_flag_engine.py`, `unit/test_escalation.py`, `integration/test_escalations.py` | `/contracts/[id]/clauses`; `GET /contracts/{id}/clauses`, `POST /contracts/{id}/scan`, `POST /contracts/{id}/escalate`, `POST /escalations/{id}/resolve` | `contracts`, shared LLM |
| `deliverables` | Deliverable creation, production-status workflow for creator & brand | `app/(brand)/deliverables/page.tsx` | `interface/routers/deliverables.py`, `application/services/deliverables.py`, `domain/models/deliverable.py`, deliverable rules in `domain/logic/transitions.py`, Deliverable repo in `repos.py` | `/deliverables`; `GET /deliverables`, `POST /deals/{deal_id}/deliverables`, `PATCH /deliverables/{id}/status` | `auth`, `deals`, `activity-log` |
| `payments` | Invoices/payments, mark paid, status changes, platform fee & net amount | `app/(brand)/payments/page.tsx` | `interface/routers/payments.py`, `application/services/payments.py`, `domain/models/payment.py`, `domain/logic/payments.py`, Payment repo in `repos.py` · tests: `unit/test_payments.py` | `/payments`; `POST/GET /payments`, `PATCH /payments/{contract_id}/mark-paid`, `PATCH /payments/{contract_id}/status` | `auth`, `contracts`, `activity-log` |
| `negotiation` | Per-deal negotiation workspace: fair-rate range, growth forecast, pre-send checklist, counter-offers, AI chat, script drafting | `app/(creator)/creator/negotiate/[dealId]/page.tsx`, `components/creator/ForecastChart.tsx`, `components/creator/NegotiationChat.tsx`, `components/creator/RateCalculatorForm.tsx` | `interface/routers/negotiation.py`, `application/services/negotiation.py`, `domain/models/negotiation.py`, `domain/logic/negotiation.py`, `domain/logic/growth.py`, negotiation repos in `repos.py` · tests: `unit/test_negotiation.py` | `/creator/negotiate/[dealId]`; 10 × `/negotiation/sessions…` | `auth`, `deals`, `creators` (growth), shared LLM, shared money |
| `benchmarks` | Market rate benchmarks by niche/tier | (consumed in `creator-dashboard`) | `interface/routers/benchmarks.py`, `application/services/benchmarks.py`, `domain/models/benchmarks.py`, `domain/logic/benchmarks.py`, RateBenchmark repo in `repos.py` · tests: `unit/test_benchmarks.py`, `integration/test_benchmarks.py` | `GET /benchmarks` | — |
| `analytics` | Brand analytics: revenue by month, pipeline by stage | `app/(brand)/analytics/page.tsx` | `interface/routers/analytics.py`, `application/services/analytics.py`, `domain/models/analytics.py` · tests: `unit/test_analytics.py` | `/analytics`; `GET /analytics/brand` | `auth`, `deals`, `payments` (reads) |
| `messages` | Brand ↔ creator chat, unread indicator in sidebar | `app/(brand)/chat/page.tsx`, unread polling inside `components/AppShell.tsx` | `interface/routers/messages.py`, `application/services/messages.py`, `domain/models/message.py`, Message repo in `repos.py` | `/chat`; `GET /messages/unread`, `POST /messages/read`, `GET/POST /messages` | `auth` |
| `activity-log` | Audit trail of deal/contract/payment actions | `app/(brand)/activity/page.tsx` | `interface/routers/activity_log.py`, `application/services/activity_log.py`, `domain/models/activity_log.py`, ActivityLog repo in `repos.py` | `/activity`; `GET/POST /activity-log` | `auth` |
| `demo-mode` | Falls back to an in-memory seeded dataset when Supabase is unreachable or the keys are dummy values; demo accounts; seed/reset scripts | demo-account buttons in the 2 login pages | `demo_data.py` (1000 lines), `_DemoFallbackMixin` in `repos.py` **and** `contract_intelligence_repos.py`, `seed_demo.py`, `reset_demo.py` | `demo.*@creatoros.dev` logins; `uv run python seed_demo.py` / `reset_demo.py` | every repo |

### Shared / cross-cutting code

| Concern | Frontend | Backend |
|---|---|---|
| API client | `lib/api.ts` (openapi-fetch + bearer middleware), `lib/api-types.ts` (generated, 3,461 lines) | — |
| Session | `lib/auth.ts` (localStorage) | `interface/dependencies.py` (token → `ActorContext`, 30 s cache) |
| App shell / navigation | `components/AppShell.tsx`, `app/(brand)/layout.tsx`, `app/(creator)/layout.tsx`, `app/layout.tsx`, `app/globals.css` | `main.py` (app, CORS, router registration) |
| UI primitives | `components/StatusPill.tsx`, `components/EmptyState.tsx`, `components/GradientPanel.tsx` + `.module.css` | — |
| Config | `process.env.NEXT_PUBLIC_API_URL` read in 7 places | `config.py` (pydantic-settings, `.env`) |
| Errors | — | `exceptions.py` |
| DB | — | `infrastructure/supabase/client.py`, `domain/interfaces/repositories.py` (all repository Protocols in one file) |
| LLM | — | `domain/interfaces/llm.py`, `infrastructure/llm/gemini_adapter.py` (used by negotiation + contract-intelligence) |
| Money | inline `money()` helpers | `domain/logic/money.py` (`format_inr`) |
| Tooling | `eslint.config.mjs`, `tsconfig.json`, `playwright.config.ts` | `pyproject.toml`, `.importlinter`, `dump_openapi.py`, `tests/fakes/fake_repos.py` |
| DB schema | — | `supabase/migrations/*.sql` (5 files) |

---

## 1.2 Structure problems

### Current tree (depth 3, tracked files only)

```
/
├── .cursorrules              ✗ describes "DEALOS" on NestJS/Prisma/Redis: a different, deleted stack
├── .env.example              ✗ NestJS-era vars (JWT_SECRET, STRIPE_*, AWS_*, TURBO_*): none are read by the code
├── .eslintrc.js              ✗ legacy config for the deleted TS monorepo; ESLint 9 in frontend ignores it
├── .husky/                   ✗ hooks call pnpm/turbo type-check; not installed (no core.hooksPath, no .husky/_)
├── .npmrc, pnpm.yaml, pnpm-workspace.yaml (allowBuilds @nestjs/core, prisma…), pnpm-lock.yaml (220 KB), turbo.json
│                             ✗ workspace for a monorepo that no longer exists; CI uses npm + uv directly
├── package.json, tsconfig.json, prettier.config.js, commitlint.config.json   ✗ root workspace tooling; nothing runs it
├── docker-compose.yml        ✗ builds apps/api/Dockerfile.dev and apps/web/Dockerfile.dev, which do not exist
├── scripts/init-db.sql       ✗ only used by that docker-compose postgres
├── DESIGN_SYSTEM.md          ✗ "dark-first, indigo/violet": the real UI is a light canvas (#F6F4EF)
├── FEATURE_SPEC.md           ⚠ spec for a broader product (invoices, briefs, brand portal) than what is built
├── PROGRESS.md               ⚠ agent progress log; belongs in docs/
├── packages/shared/          ✗ "@creator-os/shared" Zod schemas, imported by nothing; tsc output (.js/.d.ts/.map) committed next to the sources in src/
├── supabase/migrations/      ✓
├── backend/                  ✓ hexagonal layers, enforced by import-linter
│   ├── main.py, config.py, exceptions.py
│   ├── demo_data.py          ✗ 1,000 lines: mode detection + 15 in-memory repos + accounts + seed
│   ├── seed_demo.py, reset_demo.py, dump_openapi.py   ⚠ scripts mixed with app modules
│   ├── domain/{models,logic,interfaces}/
│   ├── application/services/
│   ├── infrastructure/{supabase,llm,email}/, pdf.py
│   ├── interface/{routers/,dependencies.py}
│   └── tests/{unit,integration,fakes}/
│   (README.md empty; pyproject description "Add your description here")
└── frontend/
    ├── app/                  ✗ route files ARE the features: 250–400-line page components with inline helpers
    │   ├── (auth)/ (brand)/ (creator)/   ⚠ "(brand)" group also serves creator-facing /contracts, /deliverables, /payments, /chat
    │   ├── page.tsx, landing.module.css, globals.css, layout.tsx
    ├── components/           ✗ mixes shared primitives, single-feature components, 4 unused components
    │   └── creator/          ⚠ grouped by role, not by feature
    ├── lib/                  ⚠ api client, session, generated types, unused supabase client
    ├── public/               ✗ 5 create-next-app SVGs, none referenced
    └── tests/                ✗ Playwright boilerplate + an e2e spec for pages that don't exist
```

### Files in the wrong place
- **Feature logic inside route files:** every `app/**/page.tsx` holds data fetching, forms, helpers, and sub-components (for example `RevenueChart` and `BarRow` in `analytics/page.tsx`, `findHighlights` and `HighlightedText` in `clauses/page.tsx`).
- **Feature components in a shared folder:** `components/ClauseCard.tsx` is used only by contract-intelligence; `components/creator/*` is grouped by role.
- **Messages logic in the shell:** unread-message polling lives in `components/AppShell.tsx`.
- **Interface layer imports the demo module:** `interface/dependencies.py` and `interface/routers/auth.py` import `demo_data` (inline imports avoid a cycle).
- **Scripts beside app modules:** `seed_demo.py`, `reset_demo.py`, and `dump_openapi.py` sit next to `main.py`.
- **One file for all repositories:** `infrastructure/supabase/repos.py` holds 14 repositories, and `domain/interfaces/repositories.py` holds every Protocol.

### Junk & leftovers
| Item | Status | Evidence |
|---|---|---|
| `packages/shared/src/**/*.{js,d.ts,map}` (66 files) | committed build output | generated by `tsc`; package imported nowhere (`grep -r "@creator-os/shared"` hits only its own package.json) |
| `frontend/public/{file,globe,next,vercel,window}.svg` | unused | 0 references in `app/`, `components/` |
| `frontend/components/{ActivityLog,AssistantPanel,DataTable,StatTile}.tsx` | unused | 0 imports (checked: static imports; no dynamic imports or string references in the repo) |
| `frontend/lib/supabase.ts` | unused | 0 imports; the frontend talks only to the FastAPI backend |
| `frontend/tests/example.spec.ts` | Playwright boilerplate | tests playwright.dev |
| `frontend/tests/e2e/flow.spec.ts` | stale | targets `/agency` and copy ("Agency Dashboard", "₹4,25,000") absent from the app |
| `backend/domain/logic/tokens.py` | unused by the app | only `tests/unit/test_tokens.py` imports it |
| `backend/domain/logic/money.py` `demo()` + `print("ok")` | inline self-test | `if __name__ == "__main__"` block duplicates what a unit test should do |
| `.DS_Store`, `.ruff_cache`, `.turbo`, `.venv`, `__pycache__`, `node_modules`, `.next`, `playwright-report`, `test-results` | on disk, **not tracked** | already ignored; root `.gitignore` lacks Python cache entries (they are ignored by nested ignore files) |
| Empty folders | none tracked | — |

### Secrets
- **Current tree:** no committed secrets. `.env` files are ignored and were never committed in this repo's history (`git log --all` shows no `.env` paths). Example files contain placeholders only (`CHANGE_ME_…`, `your-…`).
- **Outside this repo (from earlier work, still relevant):** the old public GitHub backup repo `Bhuvan7888/AI-Content-Manager` had `backend/.env` committed with the real Supabase service-role key, Gemini key, and Resend key. If those keys have not been rotated yet, **rotate them**. This refactor does not touch them.
- **Client-side:** `frontend/lib/supabase.ts` falls back to the anon key `"dummy"` (unused file). The demo password `DemoPass123!` and the demo emails are hard-coded in the login pages. That's intentional for the demo, but see 1.5 security.

---

## 1.3 Naming problems

| Problem | Examples |
|---|---|
| Singular vs. plural across layers for the same feature | `services/deals.py` ↔ `models/deal.py`; `services/payments.py` ↔ `models/payment.py`; `services/creators.py` ↔ `models/creator.py`; `routers/benchmarks.py` ↔ `models/benchmarks.py` (plural there) |
| Vague module names | `demo_data.py` (it's mode switch + repos + seed), `repos.py`, `money.py`, `growth.py`, `pdf.py`, `storage.py`, frontend `lib/api.ts` (it's the client), `lib/auth.ts` (it's session storage) |
| Pages named by role, not feature | `app/(brand)/brand/page.tsx` is the **deals pipeline**; `app/(creator)/creator/page.tsx` is the creator dashboard; `BrandDashboard` export name |
| Same concept, different names | deal stage labels: `STAGE_LABEL` vs. `DEAL_STAGE_LABEL`; variant helpers: `variantFor` vs. `dealVariant` vs. `dealStageVariant`; currency: `money()` vs. `moneyCompact()`; deliverable labels: `STATUS_LABEL` vs. `DELIVERABLE_STATUS_LABEL` |
| One `variantFor` name, three meanings | contract status (`contracts/page.tsx`, `clauses/page.tsx`), deal status (`brand/page.tsx`), deliverable status (`deliverables/page.tsx`) |
| Inconsistent API tags | `"auth"`, `"creators"` (lowercase) vs. `"Negotiation"`, `"Payments"`, `"Benchmarks"` (capitalised) vs. `"contract_intelligence"` (snake). Tags only affect `/docs` grouping. |
| Inconsistent route naming (**not changed**: public API contract) | `/activity-log` (kebab) vs. `/negotiation/sessions` vs. singular-ish `/analytics/brand`; payment PATCHes keyed by `{contract_id}` but act on `?payment_id=` |
| Short abbreviation | `get_ci_service` (contract intelligence) |
| Test files not mirroring sources | `test_services.py` (contracts + deliverables + misc), `test_routers.py`, `test_fakes_conform.py` |
| Frontend `"use client"` page default exports | named `BrandDashboard`, `CreatorLoginPage`, … no single pattern |
| CSS modules | `auth.module.css`, `landing.module.css` live in `app/` next to the pages, not with the feature |

---

## 1.4 Duplication & repetition

| # | Cluster | Locations | ≈ dup. lines | Proposed single replacement |
|---|---|---|---|---|
| F1 | Brand vs. creator **login page** (identical except endpoint, copy, demo accounts, redirect) | `(auth)/brand/login/page.tsx`, `(auth)/creator/login/page.tsx` | ~95 | `features/auth/components/LoginForm.tsx` with a `role` prop + `features/auth/constants/demo-accounts.ts` |
| F2 | Auth page frame (logo, form column, error box, gradient art, network-error message) | 4 auth pages | ~40 | `features/auth/components/AuthPageFrame.tsx`, `NETWORK_ERROR_MESSAGE` constant |
| F3 | `DEAL_STAGE_LABEL` map | 8 copies: `brand`, `deals/[id]`, `deliverables`, `creators/[id]`, `analytics`, `negotiate/[dealId]`, `DealsTable`, (+ `STAGES` in `creator/board`) | ~50 | `shared/constants/deal-stages.ts` (`DEAL_STAGE_LABEL`) |
| F4 | `DELIVERABLE_STATUS_LABEL` map | `deals/[id]`, `deliverables` | ~10 | `features/deliverables/constants/deliverable-status.ts`, imported by deals via the deliverables `index.ts` |
| F5 | `money()` INR formatter | 7 copies (`creator`, `creator/board`, `negotiate`, `deals/[id]`, `creators/[id]`, `analytics`, `ForecastChart`) | ~25 | `shared/lib/format-currency.ts` → `formatInr()`. ⚠ `payments/page.tsx` uses `toLocaleString()` **without** `"en-IN"`, so its output differs and stays as-is unless you decide otherwise. |
| F6 | Status → pill-colour mapping | contract: 2× `variantFor` + 1 inline (`deals/[id]`); deal: `brand` + `DealsTable` identical; payment: 3 identical inline ternaries | ~45 | `shared/lib/status-variants.ts` with `contractStatusVariant`, `dealStatusVariant`, `paymentStatusVariant`. ⚠ **Divergent copies are not merged:** `deliverables/page.tsx` colours `contracted`/`in_production` as `accent`; `creators/[id]` shows `overdue` payments as `warning` (not `danger`); `creators/[id]` shows contract `void` as `neutral`. They stay as they are (see Decision 6). |
| F7 | Raw multipart `fetch` upload with manual bearer header + hard-coded base URL | `contracts/page.tsx` (×3), `deals/[id]` (×1), `creators/[id]` (×1); base-URL fallback string ×7 incl. `lib/api.ts`, `handleDownloadSample` | ~45 | `shared/lib/api-client.ts` exports `API_BASE_URL` and `uploadFile(path, file?)` built on the session helper |
| F8 | Contract-status change that cascades to deal status | `contracts/page.tsx`, `deals/[id]/page.tsx` | ~25 | `features/contracts/services/contract-status.service.ts`. ⚠ The deals copy **ignores** a failed contract PATCH and still moves the deal. That looks like a bug; it is preserved and logged (Decision 6). |
| F9 | Session-role hydration in `useEffect` (+ the same `eslint-disable` comment) | `AppShell`, `brand`, `contracts`, `deliverables`, `payments`, `chat`, `creator`, `clauses` | ~40 | `shared/hooks/useSession.ts` (returns the session after mount; one place for the hydration comment) |
| F10 | `reload()` + `useEffect` + `error`/`loading`/`EmptyState` scaffold | 11 pages | ~80 | Kept per page for now. A generic data hook would change render timing, so it is listed but **not** in scope unless approved. |
| B1 | `_DemoFallbackMixin` (`__getattribute__` redirect) | `infrastructure/supabase/repos.py`, `infrastructure/supabase/contract_intelligence_repos.py` | ~10 | `features/demo_mode/fallback.py` |
| B2 | Exception → HTTP mapping `try/except` blocks, incl. matching `ValueError` **message strings** (`"Payment not found"` → 404) | 25 blocks across `auth`, `contracts`, `creators`, `deals`, `deliverables`, `negotiation`, `payments` routers | ~110 | `shared/http_errors.py` with explicit helpers, e.g. `to_http(e, not_found={"Payment not found"})`. Each route keeps its exact status codes. No global exception handlers: those would turn today's 500s into 4xx and change behavior. |
| B3 | Supabase call boilerplate `await asyncio.to_thread(lambda: self.client.table(...)....execute())` and `Model.model_validate(res.data[0]) if res.data else None` | 68 + 12 occurrences in `repos.py`, `contract_intelligence_repos.py` | ~70 | `shared/supabase_query.py`: `run(query)` and `first(Model, res)` helpers |
| B4 | Role branch `if actor.actor_type == "creator": list_for_creator(...) else list_for_brand(...)` | 6 routers | ~20 | Left as is. It's explicit and short; merging it would hide authorization logic. |
| B5 | Router-local service factories (client + repos wiring) | 13 routers | — | Not duplication. These are the composition roots; they stay in each feature's `router.py`. |

**Total realistic de-duplication: ≈ 600 lines** (≈ 430 frontend, ≈ 190 backend), excluding F10/B4.

---

## 1.5 Code quality

**Large files** (> ~300 lines, excluding generated `api-types.ts`): `demo_data.py` 1,000 · `seed_demo.py` 522 · `contracts/page.tsx` 399 · `repos.py` 395 · `deals/[id]/page.tsx` 365 · `deliverables/page.tsx` 334 · `clauses/page.tsx` 333 · `creator/page.tsx` 331 · `fake_repos.py` 301.

**Long functions** (> ~50 lines): `demo_data._seed_demo_data` 346 · `seed_demo.main` 387 · `demo_data.add_contract_and_payment` 68 · `pdf.generate_sample_contract_pdf` 60 · `DeliverableService.update_status` 56 · `AnalyticsService.get_brand_analytics` 89. Every frontend page component is a single 150–350-line function.

**Magic values / hard-coded config:** API base URL fallback `"http://127.0.0.1:8000"` ×7. Unread poll interval `4000` ms in `AppShell`. `"DemoPass123!"` and demo emails in the login pages. `"dummy"` key sniffing in `is_demo_mode`. Socket timeout `0.3`. `limit: 100` in several fetches. `min(limit, 100)` in routers. The 30 s actor cache TTL is already a named constant ✓.

**Error handling:** 7 blind `except Exception`, 2 of them swallowed silently (`application/services/auth.py:59`, `application/services/contract_intelligence.py:126`). `ValueError` message strings are used as control flow (B2). Frontend: many mutations ignore errors entirely (`deals/[id]` deliverable/payment/invoice handlers, `creators/[id]` upload).

**Debug leftovers:** `print("ok")` in `money.py`. The prints in `seed_demo.py`/`reset_demo.py` are intentional CLI output and stay. No `console.log` in the frontend ✓. No TODO/FIXME.

**Commented-out code:** `playwright.config.ts` (create-playwright boilerplate, ~35 lines).

**Unused code:** see 1.2. Plus `markPaid` (`deals/[id]:170`), `rowIndex` (`DataTable`), `d5`/`d8` (`demo_data.py`), `anon_key` (`test_rls_role_matrix.py`). Unused frontend deps: `swr`, `@supabase/supabase-js`. Backend runtime deps that are dev tools: `pytest`, `pytest-asyncio`, `mypy`, `ruff`, `import-linter` are in `[project.dependencies]` instead of a dev group (listed only, not changed).

**Imports:** mid-file imports (`negotiation.py`: `from domain.models.negotiation import ScriptGenerateRequest` after route definitions). Inline imports of `demo_data` inside functions. 22 unsorted import blocks (ruff I001). 13 F821: `ClauseCardOut`/`EscalationOut` used in `domain/interfaces/repositories.py` annotations without import.

**Types:** 237 mypy errors. Dominant: `actor.creator_id` is `UUID | None` but passed as `UUID` after a role check that mypy can't see. Fix: give `ActorContext` a `require_creator_id()` accessor. Frontend: 4× `as any` on status PATCH bodies; `Record<string, string>` label maps lose the status union types.

**Async:** consistent `async` + `asyncio.to_thread` around the sync Supabase client ✓. The frontend mixes `.then()` chains (`reload()`) and `async/await` handlers.

**Security** (report only; no fixes during the refactor, see Decision 5):
1. 🔴 **Demo-account bypass is active in every environment.** `POST /auth/{brand,creator}/login` returns a session for any `demo.*@creatoros.dev` email **without checking the password**. `resolve_demo_actor` accepts the predictable token `demo-token-brand-<brand_uuid>` **or the raw demo `user_id`** as a bearer token. Neither is gated by `is_demo_mode()` or `ENVIRONMENT`, and the UUIDs are hard-coded in source.
2. 🔴 **10 non-auth endpoints have no authentication:** `GET /creators/{id}`; `GET …/rate-range`, `GET …/forecast`, `PATCH …/checklist` (write), `GET …/conversations`, `POST …/script` (can trigger LLM calls); `GET /contracts/{id}/clauses`, `POST /contracts/{id}/scan`, `POST /contracts/{id}/escalate` (write + email); `GET /benchmarks`. Plus `GET /contracts/sample-contract-pdf`, which is fine to leave public. The smoke test now lists these explicitly.
3. 🟠 **Missing ownership checks (IDOR):** `GET /negotiation/sessions/{id}/offers` authenticates but doesn't check that the session belongs to the caller. `POST /payments?deal_id=` and the payment PATCHes take `deal_id`/`payment_id` from the query string. I did not verify that the service checks brand ownership for every path.
4. 🟡 `CORS allow_origins=["*"]`, with an in-code justification (bearer tokens, no cookies). Acceptable, noted.
5. 🟡 Actor cache: an unbounded dict keyed by raw bearer token (already flagged in code with "ponytail").
6. ✅ No SQL string concatenation (PostgREST query builder throughout). No secrets in client code (only `NEXT_PUBLIC_*` URL/anon key).

### Quality scorecard (before)

| Dimension | Score | Why |
|---|---|---|
| Structure | 5/10 | Backend layering is good and enforced (7). Frontend has no feature boundaries (3). Root is full of a dead stack (2). |
| Naming | 6/10 | Backend mostly consistent with plural/singular drift. Frontend pages named by role, helpers inconsistent. |
| Duplication | 4/10 | ~600 duplicated lines; status maps drift apart. |
| Readability | 5/10 | 300–400-line page components, inline styles everywhere, 1,000-line demo module. |
| Maintainability | 5/10 | Fakes + import-linter help. Stale docs/configs actively mislead. Generated types drift if not regenerated. |
| Testability | 5/10 | Backend: Protocol repos + fakes, 73 tests (6 stale). Frontend: zero runnable tests before Phase 0. |

### Top 10 problems by impact
1. Demo-account login/token bypass active in production (security).
2. 10 non-auth API endpoints with no authentication, incl. writes and LLM-cost endpoints (security).
3. Frontend route files are god components; feature code is untraceable by name.
4. Dead NestJS/pnpm/Turborepo/Docker scaffolding + stale `.cursorrules`/`DESIGN_SYSTEM.md`/`.env.example` contradict the real stack and mislead people and tools.
5. CI is red: 6 stale backend tests + 5 frontend ESLint errors.
6. Status label/colour maps copied up to 8× and already drifting apart (inconsistent UI semantics).
7. Multipart uploads bypass the typed client: hand-built auth header + hard-coded base URL ×7.
8. Router error handling copy-pasted 25×, with control flow based on exception message strings.
9. `demo_data.py` (1,000 lines) + `__getattribute__` magic mixin duplicated in two files.
10. Type debt: 237 mypy errors, `as any` on API bodies, `Record<string,string>` maps.

---

# Proposed Structure

## 2.1 Feature-based folder structure

### Frontend (Next.js 16, follows the bundled docs `01-app/01-getting-started/02-project-structure.md`: optional `src/` folder, project files outside `app/`, private `_folders`)

`app/` keeps **only routing**. Each `page.tsx` becomes a one-line re-export, so every URL, route group, and layout is unchanged:
```tsx
// src/app/(brand)/deals/[id]/page.tsx
export { DealDetailPage as default } from "@/features/deals";
```

```
frontend/
├── public/                          (stays at root: required by Next)
├── tests/smoke/                     route-manifest smoke test
├── next.config.ts, tsconfig.json (@/* → ./src/*), eslint.config.mjs, playwright.config.ts, postcss.config.mjs
└── src/
    ├── app/                         routing only
    │   ├── layout.tsx, favicon.ico, page.tsx
    │   ├── _shell/AppShell.tsx      app shell (private folder: not routable)
    │   ├── (auth)/layout.tsx + brand|creator/{login,signup}/page.tsx
    │   ├── (brand)/layout.tsx + activity, analytics, brand, chat, contracts, contracts/[id]/clauses,
    │   │                         creators/[id], deals/[id], deliverables, payments
    │   └── (creator)/layout.tsx + creator, creator/board, creator/negotiate/[dealId]
    ├── features/
    │   ├── landing/            LandingPage.tsx, landing.module.css, index.ts
    │   ├── auth/               BrandLoginPage.tsx, CreatorLoginPage.tsx, BrandSignupPage.tsx, CreatorSignupPage.tsx,
    │   │                       components/{LoginForm,AuthPageFrame}.tsx, constants/demo-accounts.ts, auth.module.css, index.ts
    │   ├── deals/              BrandDealsPage.tsx, DealDetailPage.tsx, CreatorDealBoardPage.tsx, index.ts
    │   ├── creators/           CreatorProfilePage.tsx, components/GrowthTracker.tsx, index.ts
    │   ├── creator-dashboard/  CreatorDashboardPage.tsx, components/DealsTable.tsx, index.ts
    │   ├── contracts/          ContractsPage.tsx, services/contract-status.service.ts, index.ts
    │   ├── contract-intelligence/ ClauseReviewPage.tsx, components/{ClauseCard,HighlightedText}.tsx,
    │   │                       utils/find-highlights.utils.ts, index.ts
    │   ├── deliverables/       DeliverablesPage.tsx, constants/deliverable-status.ts, utils/available-statuses.utils.ts, index.ts
    │   ├── payments/           PaymentsPage.tsx, index.ts
    │   ├── negotiation/        NegotiationPage.tsx, components/{ForecastChart,NegotiationChat,RateCalculatorForm}.tsx, index.ts
    │   ├── analytics/          AnalyticsPage.tsx, components/{RevenueChart,BarRow}.tsx, index.ts
    │   ├── messages/           ChatPage.tsx, hooks/useUnreadMessages.ts, index.ts
    │   └── activity-log/       ActivityLogPage.tsx, index.ts
    ├── shared/
    │   ├── components/ui/      StatusPill.tsx, EmptyState.tsx, GradientPanel.tsx, GradientPanel.module.css
    │   ├── hooks/              useSession.ts
    │   ├── lib/                api-client.ts (+ uploadFile, API_BASE_URL), api-types.ts (generated),
    │   │                       session.ts, format-currency.ts, status-variants.ts
    │   └── constants/          deal-stages.ts
    └── styles/globals.css
```
`deals` and `creator-dashboard` are separate features on purpose: the creator dashboard is a composition page that pulls from 4 features through their `index.ts`.

### Backend (FastAPI, Python 3.13)

```
backend/
├── main.py                      unchanged entry point (`uv run python main.py`, `main:app`)
├── pyproject.toml, uv.lock, .importlinter (rewritten, see below), .python-version
├── features/
│   ├── __init__.py
│   ├── auth/                    __init__.py (public API), router.py, service.py, models.py, dependencies.py (ActorContext, get_current_actor/brand)
│   ├── brands/                  models.py, repository.py (Protocol), supabase_repository.py
│   ├── creators/                router.py, service.py, models.py, repository.py, supabase_repository.py
│   ├── deals/                   router.py, service.py, models.py, repository.py, supabase_repository.py
│   ├── contracts/               router.py, service.py, models.py, rules.py, repository.py, supabase_repository.py,
│   │                            contract_storage.py, sample_contract_pdf.py
│   ├── contract_intelligence/   router.py, service.py, clause_explanation_service.py, models.py,
│   │                            red_flag_rules.py, escalation_rules.py, repository.py, supabase_repository.py,
│   │                            email_port.py, resend_email_adapter.py
│   ├── deliverables/            router.py, service.py, models.py, rules.py, repository.py, supabase_repository.py
│   ├── payments/                router.py, service.py, models.py, rules.py, repository.py, supabase_repository.py
│   ├── negotiation/             router.py, service.py, models.py, rules.py, growth_forecast.py, repository.py, supabase_repository.py
│   ├── benchmarks/              router.py, service.py, models.py, rules.py, repository.py, supabase_repository.py
│   ├── analytics/               router.py, service.py, models.py
│   ├── messages/                router.py, service.py, models.py, repository.py, supabase_repository.py
│   ├── activity_log/            router.py, service.py, models.py, repository.py, supabase_repository.py
│   └── demo_mode/               mode.py (is_demo_mode), accounts.py, store.py, in_memory_repositories.py, seed.py, fallback.py
├── shared/
│   ├── config.py                (was config.py)
│   ├── errors.py                (was exceptions.py)
│   ├── http_errors.py           (new, B2)
│   ├── supabase_client.py       (was infrastructure/supabase/client.py)
│   ├── supabase_query.py        (new, B3)
│   ├── money.py                 (was domain/logic/money.py)
│   └── llm/llm_port.py, llm/gemini_adapter.py
├── scripts/                     seed_demo.py, reset_demo.py, dump_openapi.py   → `uv run python -m scripts.seed_demo`
└── tests/
    ├── fakes/fake_repos.py, fakes/test_fakes_conform.py
    ├── architecture/test_layering.py
    ├── smoke/test_api_contract.py
    └── features/<feature>/test_<feature>_<unit>.py   (mirrors features/)
```

**Layering is kept, now per feature.** `.importlinter` becomes:
- **Contract 1, layers with `containers = features.*`:** `router` > `service | clause_explanation_service` > `models | rules | repository | …_port`. This is the same rule as today's `interface > application > domain`, enforced inside every feature. I'll verify that import-linter 2.13 handles layers that are missing from some containers before migrating; if it doesn't, I'll use one contract per feature.
- **Contract 2, forbidden:** `shared` must not import `features`.
- `tests/architecture/test_layering.py` keeps running `lint-imports`.

Cross-feature imports go only through `features/<name>/__init__.py` (e.g. `from features.activity_log import ActivityLog`).

## 2.2 Naming conventions

| Thing | Convention | Example |
|---|---|---|
| Folders (frontend) | kebab-case | `contract-intelligence/` |
| Packages (Python) | snake_case (hyphens are illegal) | `contract_intelligence/` |
| React components & page components | PascalCase, one per file, file = component | `DealDetailPage.tsx`, `ClauseCard.tsx` |
| Hooks | `useCamelCase.ts` | `useUnreadMessages.ts` |
| Other TS | kebab-case + role suffix where useful | `contract-status.service.ts`, `find-highlights.utils.ts`, `deal-stages.ts` |
| Python modules inside a feature | role names (`router.py`, `service.py`, `models.py`, `rules.py`, `repository.py`, `supabase_repository.py`) | `features/deals/service.py` |
| Python classes / functions / constants | PascalCase / snake_case / UPPER_SNAKE | `DealService`, `list_for_brand`, `ACTOR_CACHE_TTL_SECONDS` |
| TS functions / vars / constants | camelCase / camelCase / UPPER_SNAKE | `formatInr`, `DEAL_STAGE_LABEL` |
| Tests | mirror the unit under test | `tests/features/deals/test_deals_service.py` |
| API routes | **unchanged** (public contract) | — |
| API tags (docs grouping only) | kebab-case feature name | `"contract-intelligence"`: optional, changes only `/docs` grouping and generated `operationId`s, so it is **not** done unless approved |
| Banned file names | `helper`, `utils2`, `misc`, `temp`, `new`, `final`, `data`, `repos` | — |

Python modules use folder-scoped role names (`features/deals/service.py`) rather than `deals_service.py`. import-linter's `containers` needs the same module names in every feature, and the feature name is still in the path.

## 2.3 Complete rename / move map

All moves use `git mv`. "split" means one source becomes several files: the original is `git mv`'d to the largest piece, and the rest are new files.

### Frontend (`frontend/` prefix omitted)

| Old path | New path | Feature | Reason |
|---|---|---|---|
| `app/layout.tsx` | `src/app/layout.tsx` | app | `src/` layout |
| `app/favicon.ico` | `src/app/favicon.ico` | app | `src/` layout |
| `app/globals.css` | `src/styles/globals.css` | app | styles folder |
| `app/page.tsx` | `src/features/landing/LandingPage.tsx` (+ new 1-line `src/app/page.tsx`) | landing | page logic out of routing |
| `app/landing.module.css` | `src/features/landing/landing.module.css` | landing | colocate |
| `app/(auth)/layout.tsx` | `src/app/(auth)/layout.tsx` | auth | `src/` layout |
| `app/(auth)/auth.module.css` | `src/features/auth/auth.module.css` | auth | colocate |
| `app/(auth)/brand/login/page.tsx` | `src/features/auth/BrandLoginPage.tsx` (+ route stub) | auth | merge F1 with creator login → `components/LoginForm.tsx` |
| `app/(auth)/creator/login/page.tsx` | `src/features/auth/CreatorLoginPage.tsx` (+ route stub) | auth | merge F1 |
| `app/(auth)/brand/signup/page.tsx` | `src/features/auth/BrandSignupPage.tsx` (+ route stub) | auth | F2 frame |
| `app/(auth)/creator/signup/page.tsx` | `src/features/auth/CreatorSignupPage.tsx` (+ route stub) | auth | F2 frame |
| `app/(brand)/layout.tsx` | `src/app/(brand)/layout.tsx` | app | `src/` layout |
| `app/(creator)/layout.tsx` | `src/app/(creator)/layout.tsx` | app | `src/` layout |
| `app/(brand)/brand/page.tsx` | `src/features/deals/BrandDealsPage.tsx` (+ stub) | deals | it's the brand deal pipeline |
| `app/(brand)/deals/[id]/page.tsx` | `src/features/deals/DealDetailPage.tsx` (+ stub) | deals | |
| `app/(creator)/creator/board/page.tsx` | `src/features/deals/CreatorDealBoardPage.tsx` (+ stub) | deals | |
| `app/(creator)/creator/page.tsx` | `src/features/creator-dashboard/CreatorDashboardPage.tsx` (+ stub) | creator-dashboard | |
| `app/(brand)/creators/[id]/page.tsx` | `src/features/creators/CreatorProfilePage.tsx` (+ stub) | creators | |
| `app/(brand)/contracts/page.tsx` | `src/features/contracts/ContractsPage.tsx` (+ stub) | contracts | |
| `app/(brand)/contracts/[id]/clauses/page.tsx` | `src/features/contract-intelligence/ClauseReviewPage.tsx` (+ stub); split out `components/HighlightedText.tsx`, `utils/find-highlights.utils.ts` | contract-intelligence | |
| `app/(brand)/deliverables/page.tsx` | `src/features/deliverables/DeliverablesPage.tsx` (+ stub); split out `utils/available-statuses.utils.ts` | deliverables | |
| `app/(brand)/payments/page.tsx` | `src/features/payments/PaymentsPage.tsx` (+ stub) | payments | |
| `app/(brand)/analytics/page.tsx` | `src/features/analytics/AnalyticsPage.tsx` (+ stub); split out `components/RevenueChart.tsx`, `components/BarRow.tsx` | analytics | |
| `app/(brand)/chat/page.tsx` | `src/features/messages/ChatPage.tsx` (+ stub) | messages | |
| `app/(brand)/activity/page.tsx` | `src/features/activity-log/ActivityLogPage.tsx` (+ stub) | activity-log | |
| `app/(creator)/creator/negotiate/[dealId]/page.tsx` | `src/features/negotiation/NegotiationPage.tsx` (+ stub) | negotiation | |
| `components/AppShell.tsx` | `src/app/_shell/AppShell.tsx`; unread polling → `src/features/messages/hooks/useUnreadMessages.ts` | app / messages | shell belongs to app; polling belongs to messages |
| `components/StatusPill.tsx` | `src/shared/components/ui/StatusPill.tsx` | shared | used by 9 features |
| `components/EmptyState.tsx` | `src/shared/components/ui/EmptyState.tsx` | shared | used by 11 features |
| `components/GradientPanel.tsx` | `src/shared/components/ui/GradientPanel.tsx` | shared | landing + auth |
| `components/GradientPanel.module.css` | `src/shared/components/ui/GradientPanel.module.css` | shared | |
| `components/ClauseCard.tsx` | `src/features/contract-intelligence/components/ClauseCard.tsx` | contract-intelligence | single-feature |
| `components/creator/DealsTable.tsx` | `src/features/creator-dashboard/components/DealsTable.tsx` | creator-dashboard | single-feature |
| `components/creator/GrowthTracker.tsx` | `src/features/creators/components/GrowthTracker.tsx` | creators | growth snapshots belong to `creators` |
| `components/creator/ForecastChart.tsx` | `src/features/negotiation/components/ForecastChart.tsx` | negotiation | |
| `components/creator/NegotiationChat.tsx` | `src/features/negotiation/components/NegotiationChat.tsx` | negotiation | |
| `components/creator/RateCalculatorForm.tsx` | `src/features/negotiation/components/RateCalculatorForm.tsx` | negotiation | |
| `lib/api.ts` | `src/shared/lib/api-client.ts` | shared | descriptive name; + `uploadFile`, `API_BASE_URL` (F7) |
| `lib/api-types.ts` | `src/shared/lib/api-types.ts` | shared | update `generate:api` script output path |
| `lib/auth.ts` | `src/shared/lib/session.ts` | shared | it's session storage; used by 10+ files |
| `components/ActivityLog.tsx` | `_deprecated/frontend/components/ActivityLog.tsx` | — | unused |
| `components/AssistantPanel.tsx` | `_deprecated/frontend/components/AssistantPanel.tsx` | — | unused |
| `components/DataTable.tsx` | `_deprecated/frontend/components/DataTable.tsx` | — | unused |
| `components/StatTile.tsx` | `_deprecated/frontend/components/StatTile.tsx` | — | unused |
| `lib/supabase.ts` | `_deprecated/frontend/lib/supabase.ts` | — | unused |
| `tests/example.spec.ts` | `_deprecated/frontend/tests/example.spec.ts` | — | boilerplate |
| `tests/e2e/flow.spec.ts` | `_deprecated/frontend/tests/e2e/flow.spec.ts` | — | targets nonexistent pages |
| `public/{file,globe,next,vercel,window}.svg` | delete (Checkpoint 2) | — | 0 references |
| — new — | `src/shared/lib/format-currency.ts`, `src/shared/lib/status-variants.ts`, `src/shared/constants/deal-stages.ts`, `src/shared/hooks/useSession.ts`, `src/features/auth/components/{LoginForm,AuthPageFrame}.tsx`, `src/features/auth/constants/demo-accounts.ts`, `src/features/deliverables/constants/deliverable-status.ts`, `src/features/contracts/services/contract-status.service.ts`, 13 × `index.ts`, 18 × route stubs | | de-dup + public APIs |

The repo-root `_deprecated/` keeps the frontend's own `tsconfig`/ESLint from compiling dead code; it sits outside `frontend/`.

### Backend (`backend/` prefix omitted)

| Old path | New path | Feature |
|---|---|---|
| `interface/routers/auth.py` | `features/auth/router.py` | auth |
| `application/services/auth.py` | `features/auth/service.py` | auth |
| `domain/models/auth.py` | `features/auth/models.py` | auth |
| `interface/dependencies.py` | `features/auth/dependencies.py` | auth |
| `domain/models/brand.py` | `features/brands/models.py` | brands |
| `interface/routers/creators.py` | `features/creators/router.py` | creators |
| `application/services/creators.py` | `features/creators/service.py` | creators |
| `domain/models/creator.py` | `features/creators/models.py` | creators |
| `interface/routers/deals.py` | `features/deals/router.py` | deals |
| `application/services/deals.py` | `features/deals/service.py` | deals |
| `domain/models/deal.py` | `features/deals/models.py` | deals |
| `interface/routers/contracts.py` | `features/contracts/router.py` | contracts |
| `application/services/contracts.py` | `features/contracts/service.py` | contracts |
| `domain/models/contract.py` | `features/contracts/models.py` | contracts |
| `domain/logic/transitions.py` | split → `features/contracts/rules.py` + `features/deliverables/rules.py` | contracts, deliverables |
| `infrastructure/pdf.py` | `features/contracts/sample_contract_pdf.py` | contracts |
| `infrastructure/supabase/storage.py` | `features/contracts/contract_storage.py` | contracts |
| `interface/routers/contract_intelligence.py` | `features/contract_intelligence/router.py` | contract-intelligence |
| `application/services/contract_intelligence.py` | `features/contract_intelligence/service.py` | contract-intelligence |
| `application/services/clause_explanation.py` | `features/contract_intelligence/clause_explanation_service.py` | contract-intelligence |
| `domain/models/contract_intelligence.py` | `features/contract_intelligence/models.py` | contract-intelligence |
| `domain/logic/red_flag_engine.py` | `features/contract_intelligence/red_flag_rules.py` | contract-intelligence |
| `domain/logic/escalation.py` | `features/contract_intelligence/escalation_rules.py` | contract-intelligence |
| `domain/interfaces/email.py` | `features/contract_intelligence/email_port.py` | contract-intelligence (only user) |
| `infrastructure/email/resend_adapter.py` | `features/contract_intelligence/resend_email_adapter.py` | contract-intelligence |
| `infrastructure/supabase/contract_intelligence_repos.py` | `features/contract_intelligence/supabase_repository.py` | contract-intelligence |
| `interface/routers/deliverables.py` | `features/deliverables/router.py` | deliverables |
| `application/services/deliverables.py` | `features/deliverables/service.py` | deliverables |
| `domain/models/deliverable.py` | `features/deliverables/models.py` | deliverables |
| `interface/routers/payments.py` | `features/payments/router.py` | payments |
| `application/services/payments.py` | `features/payments/service.py` | payments |
| `domain/models/payment.py` | `features/payments/models.py` | payments |
| `domain/logic/payments.py` | `features/payments/rules.py` | payments |
| `interface/routers/negotiation.py` | `features/negotiation/router.py` | negotiation |
| `application/services/negotiation.py` | `features/negotiation/service.py` | negotiation |
| `domain/models/negotiation.py` | `features/negotiation/models.py` | negotiation |
| `domain/logic/negotiation.py` | `features/negotiation/rules.py` | negotiation |
| `domain/logic/growth.py` | `features/negotiation/growth_forecast.py` | negotiation |
| `interface/routers/benchmarks.py` | `features/benchmarks/router.py` | benchmarks |
| `application/services/benchmarks.py` | `features/benchmarks/service.py` | benchmarks |
| `domain/models/benchmarks.py` | `features/benchmarks/models.py` | benchmarks |
| `domain/logic/benchmarks.py` | `features/benchmarks/rules.py` | benchmarks |
| `interface/routers/analytics.py` | `features/analytics/router.py` | analytics |
| `application/services/analytics.py` | `features/analytics/service.py` | analytics |
| `domain/models/analytics.py` | `features/analytics/models.py` | analytics |
| `interface/routers/messages.py` | `features/messages/router.py` | messages |
| `application/services/messages.py` | `features/messages/service.py` | messages |
| `domain/models/message.py` | `features/messages/models.py` | messages |
| `interface/routers/activity_log.py` | `features/activity_log/router.py` | activity-log |
| `application/services/activity_log.py` | `features/activity_log/service.py` | activity-log |
| `domain/models/activity_log.py` | `features/activity_log/models.py` | activity-log |
| `infrastructure/supabase/repos.py` | split → 11 × `features/<f>/supabase_repository.py` | all |
| `domain/interfaces/repositories.py` | split → 12 × `features/<f>/repository.py` | all |
| `demo_data.py` | split → `features/demo_mode/{mode,accounts,store,in_memory_repositories,seed}.py` | demo-mode |
| — (B1) | `features/demo_mode/fallback.py` (one `_DemoFallbackMixin`) | demo-mode |
| `config.py` | `shared/config.py` | shared |
| `exceptions.py` | `shared/errors.py` | shared |
| `infrastructure/supabase/client.py` | `shared/supabase_client.py` | shared |
| `domain/logic/money.py` | `shared/money.py` (self-test → `tests/shared/test_money.py`) | shared |
| `domain/interfaces/llm.py` | `shared/llm/llm_port.py` | shared |
| `infrastructure/llm/gemini_adapter.py` | `shared/llm/gemini_adapter.py` | shared |
| `seed_demo.py`, `reset_demo.py`, `dump_openapi.py` | `scripts/` | scripts |
| `domain/logic/tokens.py` + `tests/unit/test_tokens.py` | `_deprecated/backend/` | unused |
| 9 × `__init__.py` under `domain/`, `application/`, `infrastructure/`, `interface/` | removed once empty | — |
| `tests/unit/test_<x>.py` (13), `tests/integration/test_<x>.py` (4) | `tests/features/<feature>/test_<feature>_<unit>.py`; `test_services.py` split by feature; `test_layering.py` → `tests/architecture/`; `test_fakes_conform.py` → `tests/fakes/` | tests |

### Repo root

| Old path | New path | Reason |
|---|---|---|
| `packages/shared/` (85 files) | `_deprecated/packages/shared/` (its 66 build-output files deleted at Checkpoint 2) | imported by nothing |
| `turbo.json`, `pnpm-workspace.yaml`, `pnpm.yaml`, `pnpm-lock.yaml`, `.npmrc`, root `package.json`, root `tsconfig.json`, `.eslintrc.js`, `commitlint.config.json`, `.husky/` | `_deprecated/root-workspace/` | dead monorepo tooling (Decision 3) |
| `docker-compose.yml`, `scripts/init-db.sql` | `_deprecated/docker/` | references missing `apps/*` Dockerfiles |
| `.env.example` (root) | `_deprecated/` → replaced by `backend/.env.example` (exists, correct) + new `frontend/.env.example` (`NEXT_PUBLIC_API_URL`) | none of the root vars are read |
| `.cursorrules` | `_deprecated/` | describes another product/stack |
| `DESIGN_SYSTEM.md`, `FEATURE_SPEC.md` | `docs/archive/` | stale / aspirational |
| `PROGRESS.md` | `docs/PROGRESS.md` | docs folder |
| `prettier.config.js` | `frontend/prettier.config.js` (Phase 4.6) | the only Node package left |
| — new — | `docs/ARCHITECTURE.md`, `docs/FEATURES.md` | Phase 5 |

### Counts

| | Frontend | Backend (src) | Backend tests | Root/docs | Total |
|---|---|---|---|---|---|
| Moves/renames (`git mv`) | 41 | 62 | 18 | 6 | **127** |
| Splits (1 file → many) | 4 | 4 (`repos.py`, `repositories.py`, `demo_data.py`, `transitions.py`) | 1 (`test_services.py`) | — | **9** |
| Merges (duplicates → one) | 10 clusters (F1–F9 + login pages) | 3 clusters (B1–B3) | — | — | **13** |
| → `_deprecated/` | 7 | 1 | 1 | ~100 (packages/shared + root tooling) | **~109** |
| Delete outright (Checkpoint 2, proof above) | 5 SVGs | — | — | 66 build artifacts | **71** |
| New files | ~40 (18 stubs, 13 index, ~9 shared/feature) | ~30 (`__init__`s, shared helpers) | ~15 `__init__`s | 2 docs | ~87 |

## 2.4 De-duplication plan

| Cluster | Shared abstraction | Lives in | Call sites switching |
|---|---|---|---|
| F1 | `<LoginForm role demoAccounts …>` | `features/auth/components/LoginForm.tsx` | `BrandLoginPage`, `CreatorLoginPage` |
| F2 | `<AuthPageFrame>`, `NETWORK_ERROR_MESSAGE` | `features/auth/components/AuthPageFrame.tsx` | 4 auth pages |
| F3 | `DEAL_STAGE_LABEL` | `shared/constants/deal-stages.ts` | 8 sites |
| F4 | `DELIVERABLE_STATUS_LABEL` | `features/deliverables/constants/deliverable-status.ts` | `DeliverablesPage`, `DealDetailPage` |
| F5 | `formatInr()`, `formatInrCompact()` | `shared/lib/format-currency.ts` | 7 sites (not `PaymentsPage`) |
| F6 | `contractStatusVariant`, `dealStatusVariant`, `paymentStatusVariant` | `shared/lib/status-variants.ts` | only the byte-identical copies; divergent ones keep local mappings, marked with a comment |
| F7 | `API_BASE_URL`, `uploadFile(path, file?)` | `shared/lib/api-client.ts` | 5 uploads + sample download + client base URL |
| F8 | `changeContractStatus(contract, next, deal, { abortOnError })` | `features/contracts/services/contract-status.service.ts` | `ContractsPage` (`abortOnError: true`), `DealDetailPage` (`false`, preserving today's behavior) |
| F9 | `useSession()` | `shared/hooks/useSession.ts` | 8 sites |
| B1 | `DemoFallbackMixin` | `features/demo_mode/fallback.py` | 2 repo modules → all `supabase_repository.py` |
| B2 | `to_http_error(exc, *, not_found=…, conflict=…)` | `shared/http_errors.py` | 25 `except` blocks; per-route codes unchanged, enforced by smoke + router tests |
| B3 | `run_query(fn)`, `first_or_none(Model, res)` | `shared/supabase_query.py` | 80 call sites in Supabase repos |

---

## 🛑 Decisions needed (Checkpoint 1)

| # | Decision | Recommendation |
|---|---|---|
| 1 | **Backend layout.** (a) feature-first as above, keeping the enforced layering per feature via import-linter containers; (b) keep the current hexagonal layer folders, only fix naming, split `repos.py`/`demo_data.py`, and document a feature map. | **(a).** It meets the goal of tracing by feature name, and the layering guarantee is kept. (b) is lower churn if you'd rather not move the backend. |
| 2 | Move the frontend into `frontend/src/` (alias `@/*` → `./src/*`). | **Yes.** Officially supported in Next 16 and separates code from config. |
| 3 | Root Node workspace (pnpm/turbo/husky/commitlint/root package.json/lockfile, docker-compose, root `.env.example`, `.cursorrules`) → `_deprecated/`. Keep Prettier by moving its config (and adding `prettier` as a frontend devDependency) in Phase 4.6. | **Yes.** CI already ignores all of it. |
| 4 | The 6 stale backend tests: update them to match today's intentional behavior (separate `test:` commits), or leave them failing. | **Update them**, but only after you confirm the reversible transitions and loosened deliverable gating are intended. |
| 5 | Security findings (demo bypass, 10 unauthenticated endpoints, IDOR). Fixing them changes behavior, so per the rules they are out of scope. | **Fix them in a separate follow-up branch right after this refactor.** At minimum, gate demo login/tokens behind `is_demo_mode()`. Tell me if you want any of it in this branch as `fix:` commits. |
| 6 | Divergent duplicates (deliverables page deal colours, creator-profile payment/contract colours, deal-detail cascade ignoring a failed contract PATCH). | **Preserve as-is** and log them as probable bugs; unify later if you want. |
| 7 | API tags → kebab-case (changes only `/docs` grouping and generated `operationId`s, which regenerates `api-types.ts`). | **Skip.** Not worth the generated-type churn. |
| 8 | F10 (generic data-loading hook for the 11 `reload()` pages). | **Skip.** Risks render-timing changes. |
