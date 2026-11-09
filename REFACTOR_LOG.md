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
