# Refactor Log

Every move, rename, merge, and deletion, with a one-line reason. Newest at the bottom.

## Phase 0 — Baseline

| Action | Path | Reason |
|---|---|---|
| add | `REFACTOR_BASELINE.md` | record pre-refactor check results |
| add | `backend/tests/smoke/__init__.py`, `backend/tests/smoke/test_api_contract.py` | lock the 55-route API contract + 401 on protected routes |
| add | `frontend/tests/smoke/check-routes.mjs`, `frontend/tests/smoke/routes.snapshot.json` | lock the 19 public frontend URLs |
| edit | `frontend/package.json` | add `test:smoke` script (no dependency change) |

## Phase 1–2 — Audit & proposal

| Action | Path | Reason |
|---|---|---|
| add | `AUDIT.md` | feature inventory, problems, proposed structure (awaiting Checkpoint 1 approval) |

## Phase 3.1 — Hygiene

| Action | Path | Reason |
|---|---|---|
| move | `turbo.json`, `pnpm-workspace.yaml`, `pnpm.yaml`, `pnpm-lock.yaml`, `.npmrc`, `package.json`, `tsconfig.json`, `.eslintrc.js`, `commitlint.config.json`, `.husky/` → `_deprecated/root-workspace/` | tooling for the deleted pnpm/Turborepo NestJS monorepo; CI and both apps don't use it; husky hooks were never installed |
| move | `.env.example` → `_deprecated/root-workspace/.env.example` | lists NestJS-era vars; none are read by the code |
| move | `docker-compose.yml`, `scripts/init-db.sql` → `_deprecated/docker/` | compose builds `apps/*/Dockerfile.dev`, which don't exist |
| move | `.cursorrules` → `_deprecated/.cursorrules` | describes a different product/stack ("DEALOS", NestJS) and misleads AI tools |
| move | `packages/shared/` → `_deprecated/packages/shared/` | `@creator-os/shared` imported by nothing |
| move | `DESIGN_SYSTEM.md`, `FEATURE_SPEC.md` → `docs/archive/` | stale (dark theme) / aspirational spec |
| move | `PROGRESS.md` → `docs/PROGRESS.md` | docs live in `docs/` |
| add | `_deprecated/README.md` | explains the folder |
| add | `frontend/.env.example` | documents `NEXT_PUBLIC_API_URL` (the only env var the frontend reads); `backend/.env.example` already lists all 8 backend vars |
| edit | `.gitignore` | dropped Prisma `apps/api` entries; added Python caches, Playwright output, `.env.*` with `!.env.example` |
| edit | `frontend/.gitignore` | un-ignore `.env.example` (`.env*` was swallowing it) |
| fix | `backend/tests/smoke/test_api_contract.py` | type annotation so the new file adds no mypy error |

## Phase 3.2 — Skeleton

| Action | Path | Reason |
|---|---|---|
| move | `frontend/app/` → `frontend/src/app/`, `frontend/components/` → `frontend/src/components/`, `frontend/lib/` → `frontend/src/lib/` | Next 16 `src/` folder (Decision 2); contents unchanged |
| edit | `frontend/tsconfig.json` | `@/*` → `./src/*` (every import already used `@/`, so no import edits were needed) |
| edit | `frontend/package.json` | `generate:api` writes to `src/lib/api-types.ts` |
| add | `backend/features/__init__.py`, `backend/shared/__init__.py` | target packages |

## Phase 3.3 — Backend shared modules (moved before features because every feature imports them)

| Action | Path | Reason |
|---|---|---|
| move | `backend/config.py` → `backend/shared/config.py` | cross-cutting settings |
| move | `backend/exceptions.py` → `backend/shared/errors.py` | cross-cutting domain errors |
| move | `backend/infrastructure/supabase/client.py` → `backend/shared/supabase_client.py` | used by every feature |
| move | `backend/domain/logic/money.py` → `backend/shared/money.py` | used by negotiation + LLM adapter |
| move | `backend/domain/interfaces/llm.py` → `backend/shared/llm/llm_port.py` | LLM port used by 2 features |
| move | `backend/infrastructure/llm/gemini_adapter.py` → `backend/shared/llm/gemini_adapter.py` | LLM adapter used by 2 features |
| edit | 34 importers | import paths rewritten by AST codemod; imports re-sorted (ruff I001) in touched files only |
| edit | `backend/.importlinter` | added `shared`, `features` roots + new contract: `shared` may not import features or app layers |

## Phase 3.3 — Backend feature: `demo-mode` (first, because every Supabase repository depends on its fallback mixin)

| Action | Path | Reason |
|---|---|---|
| move+split | `backend/demo_data.py` → `backend/features/demo_mode/demo_store.py` (git mv), plus new `mode.py`, `accounts.py`, `demo_auth.py`, `seed.py`, `in_memory_repositories.py` | 1,000-line module mixed 5 concerns |
| move | `_DemoFallbackMixin` from `infrastructure/supabase/repos.py` → `features/demo_mode/fallback.py` as `DemoFallbackMixin` | it belongs to demo mode; now public API of the feature |
| rename | `_seed_demo_data` → `seed_demo_data` | now called across modules |
| add | `features/demo_mode/__init__.py` | public API; `store`/demo-auth exported lazily (PEP 562) to avoid an import cycle with the repositories |
| behavior note | `DemoFallbackMixin` imports the store lazily inside `__getattribute__` | same lookup, same result; only the import moment changed (needed to break the cycle) |
| edit | importers of `demo_data` (`storage.py`, `contract_intelligence_repos.py`, `dependencies.py`, `routers/auth.py`) | now import from `features.demo_mode` |
| add | `backend/tests/smoke/demo_mode_probe.py`, `test_demo_mode_contract.py`, `demo_mode_snapshot.json` | new safety net: 42 demo-mode API responses (status/count/keys), snapshot **generated from pre-refactor commit 7f8026c** in a temporary worktree with dummy env values |

## Phase 3.3 — Backend feature: `benchmarks`

| Action | Path | Reason |
|---|---|---|
| move | `backend/interface/routers/benchmarks.py` → `backend/features/benchmarks/router.py` | feature folder |
| move | `backend/application/services/benchmarks.py` → `backend/features/benchmarks/service.py` | feature folder |
| move | `backend/domain/models/benchmarks.py` → `backend/features/benchmarks/models.py` | feature folder |
| move | `backend/domain/logic/benchmarks.py` → `backend/features/benchmarks/rules.py` | feature folder |
| split | `SupabaseRateBenchmarkRepo` from `backend/infrastructure/supabase/repos.py` → `backend/features/benchmarks/supabase_repository.py` | one repository/port per feature |
| split | `RateBenchmarkRepo` from `backend/domain/interfaces/repositories.py` → `backend/features/benchmarks/repository.py` | one repository/port per feature |
| move | `backend/tests/unit/test_benchmarks.py` → `backend/tests/features/benchmarks/test_benchmarks_rules.py` | tests mirror the feature |
| move | `backend/tests/integration/test_benchmarks.py` → `backend/tests/features/benchmarks/test_benchmarks_api.py` | tests mirror the feature |
| add | `backend/features/benchmarks/__init__.py` | public API (generated from names other packages import) |
| edit | all importers | rewritten by AST codemod; cross-feature imports go through the package index |
| edit | `backend/main.py` | routers imported explicitly as `<feature>_router` (include order unchanged) so each feature move is a plain import rewrite |
| edit | `backend/.importlinter` | new per-feature layers contract (`router > service > models : rules : repository`), verified to fail on a deliberate violation |

## Phase 3.3 — Backend feature: `analytics`

| Action | Path | Reason |
|---|---|---|
| move | `backend/interface/routers/analytics.py` → `backend/features/analytics/router.py` | feature folder |
| move | `backend/application/services/analytics.py` → `backend/features/analytics/service.py` | feature folder |
| move | `backend/domain/models/analytics.py` → `backend/features/analytics/models.py` | feature folder |
| move | `backend/tests/unit/test_analytics.py` → `backend/tests/features/analytics/test_analytics_service.py` | tests mirror the feature |
| add | `backend/features/analytics/__init__.py` | public API (generated from names other packages import) |
| edit | all importers | rewritten by AST codemod; cross-feature imports go through the package index |
| edit | `backend/.importlinter` | feature layers marked optional `(layer)`; features don't all have every layer |
