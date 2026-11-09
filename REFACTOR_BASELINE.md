# Refactor Baseline

Recorded on branch `refactor/feature-structure` at `098ea64` (before any code change), 2026-11-09.
Toolchain: Python 3.13.9 via `uv` (`~/.local/bin/uv`), Node v22.23.1 via nvm. Neither is on the default shell `PATH` on this machine.

**Rule for the refactor:** everything marked ✅ must stay ✅. Everything marked ❌ may stay ❌ but must not get worse (count of failures/errors must not increase).

## Stack

| Part | Tech | Package manager | Checks available |
|---|---|---|---|
| `backend/` | FastAPI, Pydantic v2, Supabase (postgrest), Gemini (`google-genai`), Resend, pypdf | `uv` (`uv.lock`) | pytest, ruff, mypy, import-linter |
| `frontend/` | Next.js 16.3.1 (App Router, Turbopack), React 19, `openapi-fetch`, Tailwind v4 | `npm` (`package-lock.json`) | `tsc`, ESLint 9 (`eslint-config-next`), `next build`, Playwright (no runnable specs) |
| `supabase/` | SQL migrations, applied manually through the Supabase SQL editor | — | — |
| root | Leftover pnpm/Turborepo workspace config from a deleted NestJS stack | pnpm (unused) | none of them run |

CI (`.github/workflows/ci.yml`) runs `uv run pytest -q` (backend), plus `npx tsc --noEmit` and `npm run lint` (frontend).

## Results

| # | Command (working dir) | Result | Detail |
|---|---|---|---|
| 1 | `uv sync --frozen` (backend) | ✅ | 67 packages |
| 2 | `uv run pytest -q` (backend) | ❌ **6 failed**, 67 passed, 1 skipped | see failures below |
| 3 | `uv run ruff check .` (backend) | ❌ **202 errors** | 102 B008, 33 C408, 22 I001, 13 F821, 7 BLE001, 5 TRY002, 4 DTZ011, 3 F841, 3 FURB157, 2 F401, 2 S110, 1 each DTZ005, F811, PLW1510, SIM102, SIM103, SIM114 |
| 4 | `uv run ruff format --check .` (backend) | ❌ 74 files would be reformatted | |
| 5 | `uv run mypy .` (backend) | ❌ **237 errors** in 27 files | mostly `arg-type` (102) and `union-attr` (89): `UUID \| None` passed where `UUID` expected |
| 6 | `uv run lint-imports` (backend) | ✅ Layering contract KEPT | |
| 7 | Backend startup: `import main` + OpenAPI generation | ✅ | 55 operations registered |
| 8 | `npm ci` (frontend) | ✅ | (npm audit warnings, not addressed) |
| 9 | `npx tsc --noEmit` (frontend) | ✅ | |
| 10 | `npm run lint` (frontend) | ❌ **5 errors, 10 warnings** | 4× `no-explicit-any` (`as any` on status PATCH bodies), 1× `react-hooks/set-state-in-effect` (`contracts/[id]/clauses/page.tsx:99`), plus unused vars and `exhaustive-deps` warnings |
| 11 | `npm run build` (frontend) | ✅ | 19 app routes (see snapshot) |
| 12 | Playwright `tests/` (frontend) | ⚠️ not runnable | `example.spec.ts` hits playwright.dev; `e2e/flow.spec.ts` targets `/agency` and copy that no longer exists. Needs a running app. Not part of the baseline. |
| 13 | Root `pnpm`/`turbo` scripts | ⚠️ not used | workspace points at `packages/shared` (unused) and `frontend`; CI does not use them |

### Pre-existing backend test failures (not fixed now)

| Test | Failure | Likely cause |
|---|---|---|
| `integration/test_routers.py::test_invalid_contract_transition` | `assert 200 == 400` | Commit `8560f05` intentionally made contract statuses reversible (`domain/logic/transitions.py`); the test still expects `draft → signed`-style moves to be rejected |
| `unit/test_payments.py::test_validate_status_change` | DID NOT RAISE `InvalidStatusTransition` | same: payment reversions now allowed |
| `unit/test_payments.py::test_update_status_service` | DID NOT RAISE `InvalidStatusTransition` | same |
| `unit/test_services.py::test_contract_invalid_transition` | DID NOT RAISE `InvalidStatusTransition` | same |
| `unit/test_services.py::test_deliverable_status_role_gating` | DID NOT RAISE `PermissionDeniedError` | role gating on deliverables was loosened |
| `unit/test_clause_explanation.py::test_clause_explanation_llm_failure` | `llm_explanation` is a static string, not `None` | service now falls back to a canned explanation when the LLM fails |

All six look like **stale tests after intentional behavior changes**, not regressions. They need a product decision (update tests vs. restore old rules). See AUDIT.md "Decisions needed".

## Smoke tests added in Phase 0

| Suite | Location | What it locks | Result |
|---|---|---|---|
| Backend demo-mode contract (added in Phase 3) | `backend/tests/smoke/test_demo_mode_contract.py` | 42 read endpoints answered in demo mode (status, item count, keys), compared with a snapshot generated from the pre-refactor commit `7f8026c` | ✅ |
| Backend API contract | `backend/tests/smoke/test_api_contract.py` | the exact set of 55 `(method, path)` pairs, plus a 401 for each of the 40 auth-protected routes when no token is sent (offline, no Supabase calls) | ✅ 41 passed |
| Frontend route manifest | `frontend/tests/smoke/check-routes.mjs` + `routes.snapshot.json` (`npm run test:smoke`, after `npm run build`) | all 19 public URLs are still produced by `next build`, and no unexpected ones are added | ✅ OK |

After adding the smoke tests, the full backend suite shows **6 failed, 108 passed, 1 skipped**. Same 6 failures, 41 new passes.

## Verification command set (run after every step)

```bash
# backend
cd backend && uv run pytest -q && uv run lint-imports && uv run ruff check . --statistics | tail -1 && uv run mypy . | tail -1
# frontend
cd frontend && npx tsc --noEmit && npm run lint; npm run build && npm run test:smoke
```
Pass criteria: pytest ≤ 6 failures, and only the 6 listed above. lint-imports kept. ruff ≤ 202, mypy ≤ 237. tsc clean. ESLint ≤ 5 errors / 10 warnings. Build OK. Smoke OK.

---

## Final results (after the refactor, branch `refactor/feature-structure`)

| # | Check | Baseline | Final |
|---|---|---|---|
| 2 | `uv run pytest -q` | ❌ 6 failed, 67 passed, 1 skipped | ✅ **0 failed, 121 passed**, 1 skipped (6 stale tests updated, Decision 4; 2 tests deleted with unused `tokens.py`; new smoke, shared and money tests) |
| 3 | `ruff check .` | 202 (ruff built-in defaults) | **161** with the same defaults (`--isolated`); **66** with the new explicit `pyproject.toml` config |
| 4 | `ruff format --check .` | 74 files would change | ✅ all formatted |
| 5 | `mypy .` | 237 errors | **134** |
| 6 | `lint-imports` | ✅ 1 contract (did not see `domain/models` or `domain/interfaces`: no `__init__.py`) | ✅ 2 contracts: per-feature layers (13 features) + `shared` never imports `features` |
| 7 | Backend boot / OpenAPI | 55 operations | ✅ 55 operations, same paths and auth requirements (smoke test) |
| 9 | `tsc --noEmit` | ✅ | ✅ |
| 10 | `npm run lint` | ❌ 5 errors, 10 warnings | ✅ **0 errors**, 3 warnings (intentional `exhaustive-deps`) |
| 11 | `npm run build` | ✅ 19 routes | ✅ 19 routes, same URLs (smoke test) |
| — | `prettier --check .` | no formatter | ✅ |
| — | Demo-mode API snapshot (42 responses, generated at baseline) | — | ✅ identical |
| — | CI-pinned uv 0.11.19 `uv sync --frozen` | ✅ | ✅ |
