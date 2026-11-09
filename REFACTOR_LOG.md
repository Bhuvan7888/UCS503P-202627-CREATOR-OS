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

## Phase 3.3 — Backend feature: `messages`

| Action | Path | Reason |
|---|---|---|
| move | `backend/interface/routers/messages.py` → `backend/features/messages/router.py` | feature folder |
| move | `backend/application/services/messages.py` → `backend/features/messages/service.py` | feature folder |
| move | `backend/domain/models/message.py` → `backend/features/messages/models.py` | feature folder |
| split | `SupabaseMessageRepo` from `backend/infrastructure/supabase/repos.py` → `backend/features/messages/supabase_repository.py` | one repository/port per feature |
| split | `MessageRepo` from `backend/domain/interfaces/repositories.py` → `backend/features/messages/repository.py` | one repository/port per feature |
| add | `backend/features/messages/__init__.py` | public API (generated from names other packages import) |
| edit | all importers | rewritten by AST codemod; cross-feature imports go through the package index |

## Phase 3.3 — Backend feature: `activity_log`

| Action | Path | Reason |
|---|---|---|
| move | `backend/interface/routers/activity_log.py` → `backend/features/activity_log/router.py` | feature folder |
| move | `backend/application/services/activity_log.py` → `backend/features/activity_log/service.py` | feature folder |
| move | `backend/domain/models/activity_log.py` → `backend/features/activity_log/models.py` | feature folder |
| split | `SupabaseActivityLogRepo` from `backend/infrastructure/supabase/repos.py` → `backend/features/activity_log/supabase_repository.py` | one repository/port per feature |
| split | `ActivityLogRepo` from `backend/domain/interfaces/repositories.py` → `backend/features/activity_log/repository.py` | one repository/port per feature |
| add | `backend/features/activity_log/__init__.py` | public API (generated from names other packages import) |
| edit | all importers | rewritten by AST codemod; cross-feature imports go through the package index |
| edit | `backend/.importlinter` | `exclude_type_checking_imports = True`: imports under `if TYPE_CHECKING:` never run, so they are not real dependencies |

## Phase 3.3 — Backend feature: `payments`

| Action | Path | Reason |
|---|---|---|
| move | `backend/interface/routers/payments.py` → `backend/features/payments/router.py` | feature folder |
| move | `backend/application/services/payments.py` → `backend/features/payments/service.py` | feature folder |
| move | `backend/domain/models/payment.py` → `backend/features/payments/models.py` | feature folder |
| move | `backend/domain/logic/payments.py` → `backend/features/payments/rules.py` | feature folder |
| split | `SupabasePaymentRepo` from `backend/infrastructure/supabase/repos.py` → `backend/features/payments/supabase_repository.py` | one repository/port per feature |
| split | `PaymentRepo` from `backend/domain/interfaces/repositories.py` → `backend/features/payments/repository.py` | one repository/port per feature |
| move | `backend/tests/unit/test_payments.py` → `backend/tests/features/payments/test_payments_service.py` | tests mirror the feature |
| split | `=client`, `test_payment_mark_paid_400` from `backend/tests/integration/test_routers.py` → `backend/tests/features/payments/test_payments_api.py` | tests mirror the feature |
| add | `backend/features/payments/__init__.py` | public API (generated from names other packages import) |
| edit | all importers | rewritten by AST codemod; cross-feature imports go through the package index |

## Phase 3.3 — Backend feature: `deliverables`

| Action | Path | Reason |
|---|---|---|
| move | `backend/interface/routers/deliverables.py` → `backend/features/deliverables/router.py` | feature folder |
| move | `backend/application/services/deliverables.py` → `backend/features/deliverables/service.py` | feature folder |
| move | `backend/domain/models/deliverable.py` → `backend/features/deliverables/models.py` | feature folder |
| split | `is_valid_deliverable_transition` from `backend/domain/logic/transitions.py` → `backend/features/deliverables/rules.py` | one repository/port per feature |
| split | `SupabaseDeliverableRepo` from `backend/infrastructure/supabase/repos.py` → `backend/features/deliverables/supabase_repository.py` | one repository/port per feature |
| split | `DeliverableRepo` from `backend/domain/interfaces/repositories.py` → `backend/features/deliverables/repository.py` | one repository/port per feature |
| split | `test_deliverable_valid_transition`, `test_deliverable_status_role_gating`, `test_deliverable_revert_transitions` from `backend/tests/unit/test_services.py` → `backend/tests/features/deliverables/test_deliverables_service.py` | tests mirror the feature |
| add | `backend/features/deliverables/__init__.py` | public API (generated from names other packages import) |
| edit | all importers | rewritten by AST codemod; cross-feature imports go through the package index |

## Phase 3.3 — Backend feature: `deals`

| Action | Path | Reason |
|---|---|---|
| move | `backend/interface/routers/deals.py` → `backend/features/deals/router.py` | feature folder |
| move | `backend/application/services/deals.py` → `backend/features/deals/service.py` | feature folder |
| move | `backend/domain/models/deal.py` → `backend/features/deals/models.py` | feature folder |
| split | `SupabaseDealRepo` from `backend/infrastructure/supabase/repos.py` → `backend/features/deals/supabase_repository.py` | one repository/port per feature |
| split | `DealRepo` from `backend/domain/interfaces/repositories.py` → `backend/features/deals/repository.py` | one repository/port per feature |
| move | `backend/tests/unit/test_deals.py` → `backend/tests/features/deals/test_deals_service.py` | tests mirror the feature |
| add | `backend/features/deals/__init__.py` | public API (generated from names other packages import) |
| edit | all importers | rewritten by AST codemod; cross-feature imports go through the package index |

## Phase 3.3 — Backend feature: `brands`

| Action | Path | Reason |
|---|---|---|
| move | `backend/domain/models/brand.py` → `backend/features/brands/models.py` | feature folder |
| split | `SupabaseBrandRepo`, `SupabaseBrandMemberRepo` from `backend/infrastructure/supabase/repos.py` → `backend/features/brands/supabase_repository.py` | one repository/port per feature |
| split | `BrandRepo`, `BrandMemberRepo` from `backend/domain/interfaces/repositories.py` → `backend/features/brands/repository.py` | one repository/port per feature |
| add | `backend/features/brands/__init__.py` | public API (generated from names other packages import) |
| edit | all importers | rewritten by AST codemod; cross-feature imports go through the package index |

## Phase 3.3 — Backend feature: `creators` (+ index rule fix)

| Action | Path | Reason |
|---|---|---|
| move | `backend/interface/routers/creators.py` → `backend/features/creators/router.py` | feature folder |
| move | `backend/application/services/creators.py` → `backend/features/creators/service.py` | feature folder |
| move | `backend/domain/models/creator.py` → `backend/features/creators/models.py` | feature folder |
| split | `SupabaseCreatorRepo`, `SupabaseGrowthSnapshotRepo` from `backend/infrastructure/supabase/repos.py` → `backend/features/creators/supabase_repository.py` | one repository/port per feature |
| split | `CreatorRepo`, `GrowthSnapshotRepo` from `backend/domain/interfaces/repositories.py` → `backend/features/creators/repository.py` | one repository/port per feature |
| split | `test_creator_onboarding_writes_activity_log`, `test_creator_profile_update`, `test_creator_link_brand` from `backend/tests/unit/test_services.py` → `backend/tests/features/creators/test_creators_service.py` | tests mirror the feature |
| add | `backend/features/creators/__init__.py` | public API (generated from names other packages import) |
| edit | all importers | rewritten by AST codemod; cross-feature imports go through the package index |
| edit | all `backend/features/*/__init__.py` | Supabase repositories removed from feature indexes. The per-feature layer contract caught `creators.repository → brands index → brands.supabase_repository → demo_mode → seed → creators.service` (a hidden upward dependency). Indexes now export only the domain API; composition roots (`router.py`, `dependencies.py`) import `features.<x>.supabase_repository` directly |

## Phase 3.3 — Backend feature: `negotiation`

| Action | Path | Reason |
|---|---|---|
| move | `backend/interface/routers/negotiation.py` → `backend/features/negotiation/router.py` | feature folder |
| move | `backend/application/services/negotiation.py` → `backend/features/negotiation/service.py` | feature folder |
| move | `backend/domain/models/negotiation.py` → `backend/features/negotiation/models.py` | feature folder |
| move | `backend/domain/logic/negotiation.py` → `backend/features/negotiation/rules.py` | feature folder |
| move | `backend/domain/logic/growth.py` → `backend/features/negotiation/growth_forecast.py` | feature folder |
| split | `SupabaseNegotiationSessionRepo`, `SupabaseNegotiationConversationRepo` from `backend/infrastructure/supabase/repos.py` → `backend/features/negotiation/supabase_repository.py` | one repository/port per feature |
| split | `NegotiationSessionRepo`, `NegotiationConversationRepo` from `backend/domain/interfaces/repositories.py` → `backend/features/negotiation/repository.py` | one repository/port per feature |
| move | `backend/tests/unit/test_negotiation.py` → `backend/tests/features/negotiation/test_negotiation_service.py` | tests mirror the feature |
| split | `=client`, `test_negotiation_counter_offer_409` from `backend/tests/integration/test_routers.py` → `backend/tests/features/negotiation/test_negotiation_api.py` | tests mirror the feature |
| add | `backend/features/negotiation/__init__.py` | public API (generated from names other packages import) |
| edit | all importers | rewritten by AST codemod; cross-feature imports go through the package index |
| add | `backend/tests/conftest.py` | autouse fixture clears `app.dependency_overrides` after each test. The pre-existing failing `test_invalid_contract_transition` leaks overrides on failure; a neighbouring test used to clear them by accident, and splitting `test_routers.py` exposed the leak (the smoke tests caught it) |
| edit | `backend/shared/llm/llm_port.py`, `gemini_adapter.py` | feature models used only in annotations are imported under `TYPE_CHECKING`. Removes a runtime import cycle (`llm_port → negotiation → service → llm_port`) and keeps `shared` free of feature imports |
| finding | `domain/models/`, `domain/interfaces/` | had no `__init__.py`, so import-linter (which skips namespace packages) never saw imports of them: the baseline layering contract was weaker than it looked. All new packages have `__init__.py` |

## Phase 3.3 — Backend feature: `contract_intelligence`

| Action | Path | Reason |
|---|---|---|
| move | `backend/interface/routers/contract_intelligence.py` → `backend/features/contract_intelligence/router.py` | feature folder |
| move | `backend/application/services/contract_intelligence.py` → `backend/features/contract_intelligence/service.py` | feature folder |
| move | `backend/application/services/clause_explanation.py` → `backend/features/contract_intelligence/clause_explanation_service.py` | feature folder |
| move | `backend/domain/models/contract_intelligence.py` → `backend/features/contract_intelligence/models.py` | feature folder |
| move | `backend/domain/logic/red_flag_engine.py` → `backend/features/contract_intelligence/red_flag_rules.py` | feature folder |
| move | `backend/domain/logic/escalation.py` → `backend/features/contract_intelligence/escalation_rules.py` | feature folder |
| move | `backend/domain/interfaces/email.py` → `backend/features/contract_intelligence/email_port.py` | feature folder |
| move | `backend/infrastructure/email/resend_adapter.py` → `backend/features/contract_intelligence/resend_email_adapter.py` | feature folder |
| move | `backend/infrastructure/supabase/contract_intelligence_repos.py` → `backend/features/contract_intelligence/supabase_repository.py` | feature folder |
| split | `ClauseCardRepo`, `EscalationRepo` from `backend/domain/interfaces/repositories.py` → `backend/features/contract_intelligence/repository.py` | one repository/port per feature |
| move | `backend/tests/unit/test_contract_intelligence.py` → `backend/tests/features/contract_intelligence/test_contract_intelligence_service.py` | tests mirror the feature |
| move | `backend/tests/unit/test_clause_explanation.py` → `backend/tests/features/contract_intelligence/test_clause_explanation_service.py` | tests mirror the feature |
| move | `backend/tests/unit/test_red_flag_engine.py` → `backend/tests/features/contract_intelligence/test_red_flag_rules.py` | tests mirror the feature |
| move | `backend/tests/unit/test_escalation.py` → `backend/tests/features/contract_intelligence/test_escalation_rules.py` | tests mirror the feature |
| move | `backend/tests/integration/test_escalations.py` → `backend/tests/features/contract_intelligence/test_contract_intelligence_api.py` | tests mirror the feature |
| add | `backend/features/contract_intelligence/__init__.py` | public API (generated from names other packages import) |
| edit | all importers | rewritten by AST codemod; cross-feature imports go through the package index |
| split | `get_ci_service` from `features/contract_intelligence/router.py` → `features/contract_intelligence/dependencies.py` | the contracts feature needs it; routers are entry points, not libraries |
| rename | `get_ci_service` → `get_contract_intelligence_service` | no abbreviations |
| rule | feature indexes | wiring modules (`router.py`, `dependencies.py`, `supabase_repository.py`, `*_adapter.py`) are never exported from an index; including `dependencies.py` caused a circular import (index → dependencies → supabase repo → demo store → index) |
| fix | `features/contract_intelligence/repository.py` | added the missing `ClauseCardOut`/`EscalationOut` import (baseline F821 ×13, annotation-only, no runtime effect) |
| edit | `backend/.importlinter` | documented exception `shared.llm.gemini_adapter -> features.contract_intelligence` (ClauseInput is the Gemini structured-output schema); rule modules added to the domain layer |

## Phase 3.3 — Backend feature: `contracts`

| Action | Path | Reason |
|---|---|---|
| move | `backend/interface/routers/contracts.py` → `backend/features/contracts/router.py` | feature folder |
| move | `backend/application/services/contracts.py` → `backend/features/contracts/service.py` | feature folder |
| move | `backend/domain/models/contract.py` → `backend/features/contracts/models.py` | feature folder |
| move | `backend/infrastructure/pdf.py` → `backend/features/contracts/contract_pdf.py` | feature folder |
| move | `backend/infrastructure/supabase/storage.py` → `backend/features/contracts/contract_storage_adapter.py` | feature folder |
| split | `is_valid_contract_transition` from `backend/domain/logic/transitions.py` → `backend/features/contracts/rules.py` | one repository/port per feature |
| split | `SupabaseContractRepo` from `backend/infrastructure/supabase/repos.py` → `backend/features/contracts/supabase_repository.py` | one repository/port per feature |
| split | `ContractRepo` from `backend/domain/interfaces/repositories.py` → `backend/features/contracts/repository.py` | one repository/port per feature |
| split | `test_create_contract_persists_and_logs`, `test_contract_valid_transition`, `test_contract_invalid_transition` from `backend/tests/unit/test_services.py` → `backend/tests/features/contracts/test_contracts_service.py` | tests mirror the feature |
| split | `client`, `test_invalid_contract_transition` from `backend/tests/integration/test_routers.py` → `backend/tests/features/contracts/test_contracts_api.py` | tests mirror the feature |
| add | `backend/features/contracts/__init__.py` | public API (generated from names other packages import) |
| edit | all importers | rewritten by AST codemod; cross-feature imports go through the package index |
| remove | `backend/domain/logic/transitions.py`, `backend/tests/integration/test_routers.py`, `backend/tests/unit/test_services.py` | empty after their contents were split into the feature folders |

## Phase 3.3 — Backend feature: `auth`

| Action | Path | Reason |
|---|---|---|
| move | `backend/interface/routers/auth.py` → `backend/features/auth/router.py` | feature folder |
| move | `backend/application/services/auth.py` → `backend/features/auth/service.py` | feature folder |
| move | `backend/domain/models/auth.py` → `backend/features/auth/models.py` | feature folder |
| move | `backend/interface/dependencies.py` → `backend/features/auth/dependencies.py` | feature folder |
| move | `backend/tests/unit/test_auth.py` → `backend/tests/features/auth/test_auth_service.py` | tests mirror the feature |
| move | `backend/tests/integration/test_rls_role_matrix.py` → `backend/tests/features/auth/test_auth_rls_role_matrix.py` | tests mirror the feature |
| add | `backend/features/auth/__init__.py` | public API (generated from names other packages import) |
| edit | all importers | rewritten by AST codemod; cross-feature imports go through the package index |

## Phase 3.3 — Backend cleanup after the feature moves

| Action | Path | Reason |
|---|---|---|
| move | `backend/domain/logic/tokens.py` → `_deprecated/backend/domain/logic/tokens.py` | imported only by its own test (`grep -rn "logic.tokens"` → `tests/unit/test_tokens.py` only) |
| move | `backend/tests/unit/test_tokens.py` → `_deprecated/backend/tests/unit/test_tokens.py` | tests the deprecated module (pytest pass count 109 → 107 for this reason only) |
| move | `backend/tests/unit/test_layering.py` → `backend/tests/architecture/test_layering.py` | architecture test, not a unit test |
| move | `backend/tests/unit/test_fakes_conform.py` → `backend/tests/fakes/test_fakes_conform.py` | lives with the fakes it checks |
| move | `backend/seed_demo.py`, `reset_demo.py`, `dump_openapi.py` → `backend/scripts/` | scripts out of the app root; run as `uv run python -m scripts.<name>` from `backend/` (docstrings updated; `dump_openapi` output path unchanged because it is cwd-relative) |
| remove | `backend/infrastructure/supabase/repos.py`, `backend/domain/interfaces/repositories.py` | empty after all repositories/ports were split per feature |
| remove | `__init__.py` of `domain/`, `domain/logic/`, `application/`, `application/services/`, `infrastructure/`, `interface/`, `interface/routers/`, `tests/unit/`, `tests/integration/` | empty packages after the moves |
| edit | `backend/.importlinter` | roots are now `features` + `shared`; old global layering contract replaced by the per-feature layers contract (13 features) + `shared`-is-leaf |

## Phase 3.3 — Frontend feature: `activity-log`

| Action | Path | Reason |
|---|---|---|
| move | `frontend/src/app/(brand)/activity/page.tsx` → `frontend/src/features/activity-log/ActivityLogPage.tsx` | feature folder |
| add | `frontend/src/app/(brand)/activity/page.tsx` | one-line route stub → `@/features/activity-log/ActivityLogPage` (URL unchanged) |
| rename | default export in `frontend/src/features/activity-log/ActivityLogPage.tsx` → `ActivityLogPage` | component name = file name |

## Phase 3.3 — Frontend feature: `analytics`

| Action | Path | Reason |
|---|---|---|
| move | `frontend/src/app/(brand)/analytics/page.tsx` → `frontend/src/features/analytics/AnalyticsPage.tsx` | feature folder |
| add | `frontend/src/app/(brand)/analytics/page.tsx` | one-line route stub → `@/features/analytics/AnalyticsPage` (URL unchanged) |

## Phase 3.3 — Frontend feature: `payments`

| Action | Path | Reason |
|---|---|---|
| move | `frontend/src/app/(brand)/payments/page.tsx` → `frontend/src/features/payments/PaymentsPage.tsx` | feature folder |
| add | `frontend/src/app/(brand)/payments/page.tsx` | one-line route stub → `@/features/payments/PaymentsPage` (URL unchanged) |

## Phase 3.3 — Frontend feature: `messages`

| Action | Path | Reason |
|---|---|---|
| move | `frontend/src/app/(brand)/chat/page.tsx` → `frontend/src/features/messages/ChatPage.tsx` | feature folder |
| add | `frontend/src/app/(brand)/chat/page.tsx` | one-line route stub → `@/features/messages/ChatPage` (URL unchanged) |

## Phase 3.3 — Frontend feature: `deliverables`

| Action | Path | Reason |
|---|---|---|
| move | `frontend/src/app/(brand)/deliverables/page.tsx` → `frontend/src/features/deliverables/DeliverablesPage.tsx` | feature folder |
| add | `frontend/src/app/(brand)/deliverables/page.tsx` | one-line route stub → `@/features/deliverables/DeliverablesPage` (URL unchanged) |

## Phase 3.3 — Frontend feature: `landing`

| Action | Path | Reason |
|---|---|---|
| move | `frontend/src/app/page.tsx` → `frontend/src/features/landing/LandingPage.tsx` | feature folder |
| move | `frontend/src/app/landing.module.css` → `frontend/src/features/landing/landing.module.css` | feature folder |
| add | `frontend/src/app/page.tsx` | one-line route stub → `@/features/landing/LandingPage` (URL unchanged) |

## Phase 3.3 — Frontend feature: `creators`

| Action | Path | Reason |
|---|---|---|
| move | `frontend/src/app/(brand)/creators/[id]/page.tsx` → `frontend/src/features/creators/CreatorProfilePage.tsx` | feature folder |
| move | `frontend/src/components/creator/GrowthTracker.tsx` → `frontend/src/features/creators/components/GrowthTracker.tsx` | feature folder |
| add | `frontend/src/app/(brand)/creators/[id]/page.tsx` | one-line route stub → `@/features/creators/CreatorProfilePage` (URL unchanged) |
| rename | default export in `frontend/src/features/creators/CreatorProfilePage.tsx` → `CreatorProfilePage` | component name = file name |

## Phase 3.3 — Frontend feature: `negotiation`

| Action | Path | Reason |
|---|---|---|
| move | `frontend/src/app/(creator)/creator/negotiate/[dealId]/page.tsx` → `frontend/src/features/negotiation/NegotiationPage.tsx` | feature folder |
| move | `frontend/src/components/creator/ForecastChart.tsx` → `frontend/src/features/negotiation/components/ForecastChart.tsx` | feature folder |
| move | `frontend/src/components/creator/NegotiationChat.tsx` → `frontend/src/features/negotiation/components/NegotiationChat.tsx` | feature folder |
| move | `frontend/src/components/creator/RateCalculatorForm.tsx` → `frontend/src/features/negotiation/components/RateCalculatorForm.tsx` | feature folder |
| add | `frontend/src/app/(creator)/creator/negotiate/[dealId]/page.tsx` | one-line route stub → `@/features/negotiation/NegotiationPage` (URL unchanged) |
| rename | default export in `frontend/src/features/negotiation/NegotiationPage.tsx` → `NegotiationPage` | component name = file name |

## Phase 3.3 — Frontend feature: `contract-intelligence`

| Action | Path | Reason |
|---|---|---|
| move | `frontend/src/app/(brand)/contracts/[id]/clauses/page.tsx` → `frontend/src/features/contract-intelligence/ClauseReviewPage.tsx` | feature folder |
| move | `frontend/src/components/ClauseCard.tsx` → `frontend/src/features/contract-intelligence/components/ClauseCard.tsx` | feature folder |
| add | `frontend/src/app/(brand)/contracts/[id]/clauses/page.tsx` | one-line route stub → `@/features/contract-intelligence/ClauseReviewPage` (URL unchanged) |
| rename | default export in `frontend/src/features/contract-intelligence/ClauseReviewPage.tsx` → `ClauseReviewPage` | component name = file name |

## Phase 3.3 — Frontend feature: `contracts`

| Action | Path | Reason |
|---|---|---|
| move | `frontend/src/app/(brand)/contracts/page.tsx` → `frontend/src/features/contracts/ContractsPage.tsx` | feature folder |
| add | `frontend/src/app/(brand)/contracts/page.tsx` | one-line route stub → `@/features/contracts/ContractsPage` (URL unchanged) |

## Phase 3.3 — Frontend feature: `deals`

| Action | Path | Reason |
|---|---|---|
| move | `frontend/src/app/(brand)/brand/page.tsx` → `frontend/src/features/deals/BrandDealsPage.tsx` | feature folder |
| move | `frontend/src/app/(brand)/deals/[id]/page.tsx` → `frontend/src/features/deals/DealDetailPage.tsx` | feature folder |
| move | `frontend/src/app/(creator)/creator/board/page.tsx` → `frontend/src/features/deals/CreatorDealBoardPage.tsx` | feature folder |
| add | `frontend/src/app/(brand)/brand/page.tsx` | one-line route stub → `@/features/deals/BrandDealsPage` (URL unchanged) |
| add | `frontend/src/app/(brand)/deals/[id]/page.tsx` | one-line route stub → `@/features/deals/DealDetailPage` (URL unchanged) |
| add | `frontend/src/app/(creator)/creator/board/page.tsx` | one-line route stub → `@/features/deals/CreatorDealBoardPage` (URL unchanged) |
| rename | default export in `frontend/src/features/deals/BrandDealsPage.tsx` → `BrandDealsPage` | component name = file name |
| rename | default export in `frontend/src/features/deals/CreatorDealBoardPage.tsx` → `CreatorDealBoardPage` | component name = file name |

## Phase 3.3 — Frontend feature: `creator-dashboard`

| Action | Path | Reason |
|---|---|---|
| move | `frontend/src/app/(creator)/creator/page.tsx` → `frontend/src/features/creator-dashboard/CreatorDashboardPage.tsx` | feature folder |
| move | `frontend/src/components/creator/DealsTable.tsx` → `frontend/src/features/creator-dashboard/components/DealsTable.tsx` | feature folder |
| add | `frontend/src/app/(creator)/creator/page.tsx` | one-line route stub → `@/features/creator-dashboard/CreatorDashboardPage` (URL unchanged) |
| rename | default export in `frontend/src/features/creator-dashboard/CreatorDashboardPage.tsx` → `CreatorDashboardPage` | component name = file name |

## Phase 3.3 — Frontend feature: `auth`

| Action | Path | Reason |
|---|---|---|
| move | `frontend/src/app/(auth)/brand/login/page.tsx` → `frontend/src/features/auth/BrandLoginPage.tsx` | feature folder |
| move | `frontend/src/app/(auth)/brand/signup/page.tsx` → `frontend/src/features/auth/BrandSignupPage.tsx` | feature folder |
| move | `frontend/src/app/(auth)/creator/login/page.tsx` → `frontend/src/features/auth/CreatorLoginPage.tsx` | feature folder |
| move | `frontend/src/app/(auth)/creator/signup/page.tsx` → `frontend/src/features/auth/CreatorSignupPage.tsx` | feature folder |
| move | `frontend/src/app/(auth)/auth.module.css` → `frontend/src/features/auth/auth.module.css` | feature folder |
| add | `frontend/src/app/(auth)/brand/login/page.tsx` | one-line route stub → `@/features/auth/BrandLoginPage` (URL unchanged) |
| add | `frontend/src/app/(auth)/brand/signup/page.tsx` | one-line route stub → `@/features/auth/BrandSignupPage` (URL unchanged) |
| add | `frontend/src/app/(auth)/creator/login/page.tsx` | one-line route stub → `@/features/auth/CreatorLoginPage` (URL unchanged) |
| add | `frontend/src/app/(auth)/creator/signup/page.tsx` | one-line route stub → `@/features/auth/CreatorSignupPage` (URL unchanged) |

## Phase 3.4 — Frontend shared code

| Action | Path | Reason |
|---|---|---|
| move | `frontend/src/components/StatusPill.tsx` → `frontend/src/shared/components/ui/StatusPill.tsx` | feature folder |
| move | `frontend/src/components/EmptyState.tsx` → `frontend/src/shared/components/ui/EmptyState.tsx` | feature folder |
| move | `frontend/src/components/GradientPanel.tsx` → `frontend/src/shared/components/ui/GradientPanel.tsx` | feature folder |
| move | `frontend/src/components/GradientPanel.module.css` → `frontend/src/shared/components/ui/GradientPanel.module.css` | feature folder |
| move | `frontend/src/lib/api.ts` → `frontend/src/shared/lib/api-client.ts` | feature folder |
| move | `frontend/src/lib/api-types.ts` → `frontend/src/shared/lib/api-types.ts` | feature folder |
| move | `frontend/src/lib/auth.ts` → `frontend/src/shared/lib/session.ts` | feature folder |
| move | `frontend/src/components/AppShell.tsx` → `frontend/src/app/_shell/AppShell.tsx` | feature folder |
| move | `frontend/src/app/globals.css` → `frontend/src/styles/globals.css` | feature folder |
| edit | `frontend/package.json` | `generate:api` now writes `src/shared/lib/api-types.ts` |

## Phase 3.4 — Frontend dead code → `_deprecated/`

| Action | Path | Reason |
|---|---|---|
| move | `frontend/src/components/{ActivityLog,AssistantPanel,DataTable,StatTile}.tsx` → `_deprecated/frontend/components/` | 0 imports anywhere in `src/` (re-checked before moving) |
| move | `frontend/src/lib/supabase.ts` → `_deprecated/frontend/lib/supabase.ts` | 0 imports; the frontend only talks to the FastAPI backend |
| move | `frontend/tests/example.spec.ts`, `frontend/tests/e2e/flow.spec.ts` → `_deprecated/frontend/tests/` | Playwright boilerplate hitting playwright.dev; e2e spec targets `/agency` which doesn't exist |

## Decision 4 — Stale tests updated to the intended current behavior

| Test (new location) | Old expectation | New expectation | Why |
|---|---|---|---|
| `tests/features/contracts/test_contracts_api.py` | `draft → signed` returns 400 | `test_contract_status_can_move_freely_between_active_statuses` (200), plus `test_rejected_contract_transition_returns_400`, which forces the rule to reject so the 400 mapping stays covered | `8560f05` made contract statuses reversible |
| `tests/features/contracts/test_contracts_service.py::test_contract_rejected_transition_raises_and_does_not_log` | `draft → signed` raises | rule forced to reject → raises + no activity log | same; keeps the original intent |
| `tests/features/payments/test_payments_service.py` (2 tests) | same-status change raises | same-status allowed; unknown status (`refunded`) raises | status dropdowns allow re-selecting |
| `tests/features/deliverables/test_deliverables_service.py::test_deliverable_status_role_rules` | brand can't set `in_production` | brand may set any status; creator still can't approve | `_BRAND_ALLOWED_STATUSES` was widened deliberately |
| `tests/features/contract_intelligence/test_clause_explanation_service.py` | LLM failure → `llm_explanation is None` | LLM failure → canned `DEFAULT_FLAG_EXPLANATIONS` text | fallback added in `af9eb70` |

Backend suite: **114 passed, 0 failed** (was 6 failed).

## Phase 4 — De-duplication

| Cluster | Change | Call sites |
|---|---|---|
| B1 demo fallback mixin | deleted the second copy of `_DemoFallbackMixin` in `features/contract_intelligence/supabase_repository.py`; it now uses `features.demo_mode.DemoFallbackMixin` (identical logic). Also drops that module's eager import of the demo `store` | 2 classes |
| B2 exception → HTTP mapping | new `backend/shared/http_errors.py` (`map_errors`) + `backend/tests/shared/test_http_errors.py`; 15 copy-pasted `try/except … raise HTTPException(...)` blocks replaced by `with map_errors({...}, by_message={...}):` via an AST codemod that only touched handlers of the exact shapes. Per-route types, status codes and message overrides are unchanged; no global handlers (they would turn today's 500s into 4xx). Not touched: PDF/LLM fallback blocks in contracts, the logged LLM failure in negotiation | auth ×4, contracts ×2, creators ×1, deals ×2, deliverables ×1, negotiation ×3, payments ×2 |
| B3 Supabase query boilerplate | new `backend/shared/supabase_query.py` (`run_query`, `first_or_none`) + `backend/tests/shared/test_supabase_query.py`; `asyncio.to_thread(lambda: <query>.execute())` ×68 → `run_query(<query>)`, `M.model_validate(res.data[0]) if res.data else None` ×12 → `first_or_none(M, res)` (AST codemod, exact shapes only). **Proof:** a probe recorded the PostgREST call chain (table, filters, order, range, payload) and outcome of all 70 Supabase repository methods against a recording fake client before and after: identical | 11 `supabase_repository.py` files |
| B4 canned flag explanations | `DEFAULT_FLAG_EXPLANATIONS` was defined identically (4 entries, verified equal) in `contract_intelligence/service.py` and `clause_explanation_service.py`; one copy now lives in `contract_intelligence/red_flag_rules.py` (next to the reason codes it explains) | 2 services + 1 test |

## Phase 4 — F3 deal stage labels

| Action | Path | Reason |
|---|---|---|
| F3 | new `frontend/src/shared/constants/deal-stages.ts`; 7 identical local copies removed (entries verified equal by script before removal; `STAGE_LABEL` renamed); Kanban `STAGES` now derived from it (same keys, labels, order) | BrandDealsPage, DealDetailPage, CreatorDealBoardPage, DeliverablesPage, CreatorProfilePage, AnalyticsPage, NegotiationPage, DealsTable |

## Phase 4 — F4 deliverable status labels

| Action | Path | Reason |
|---|---|---|
| F4 | new `frontend/src/features/deliverables/constants/deliverable-status.ts`, exported from `features/deliverables/index.ts`; 2 identical copies removed (`STATUS_LABEL` renamed) | DeliverablesPage, DealDetailPage (via the deliverables index) |

## Phase 4 — F5 INR formatting

| Action | Path | Reason |
|---|---|---|
| F5 | new `frontend/src/shared/lib/format-currency.ts` (`formatInr`); 7 byte-identical `money()` helpers removed and calls renamed. Not touched: `PaymentsPage` (uses `toLocaleString()` without `en-IN`, different output, see Decision 6) and `ForecastChart`'s `moneyCompact` (single use) | CreatorDealBoardPage, NegotiationPage, CreatorDashboardPage, DealDetailPage, CreatorProfilePage, AnalyticsPage, ForecastChart |
