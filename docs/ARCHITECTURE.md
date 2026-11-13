# Architecture

Creator OS is split into two apps and a database:

- **`backend/`**: a FastAPI app (Python 3.13, managed with `uv`). It provides the HTTP API and talks to Supabase (Postgres, Auth and Storage), Gemini and Resend.
- **`frontend/`**: a Next.js 16 App Router app (React 19, managed with `npm`). It talks only to the backend, through a typed client generated from the backend's OpenAPI schema.
- **`supabase/migrations/`**: the SQL schema, applied by hand in the Supabase SQL editor.

Both apps are organised **by feature first, then by layer**. The same feature name is used in the backend, the frontend, the tests and the docs, so you can go from a feature name straight to its code. [FEATURES.md](FEATURES.md) maps every feature to its folders, URLs and endpoints.

## Folder structure

```
backend/
├── main.py                 FastAPI app: CORS + router registration (entry point: main:app)
├── features/<feature>/     one package per feature (snake_case)
│   ├── __init__.py         public API of the feature (domain API only, see "Import rules")
│   ├── router.py           HTTP endpoints + service wiring (composition root)
│   ├── dependencies.py     FastAPI dependency providers shared with other features (optional)
│   ├── service.py          application logic (orchestrates repositories and rules)
│   ├── models.py           Pydantic models (API and domain)
│   ├── rules.py            pure domain rules (transitions, calculations) (optional)
│   ├── repository.py       repository ports (typing.Protocol)
│   ├── supabase_repository.py   Supabase implementation of the ports
│   └── *_adapter.py        other external adapters (storage, email) (optional)
├── shared/                 cross-cutting code used by 2+ features; never imports features/
│   ├── config.py  errors.py  http_errors.py  pagination.py
│   ├── email/              email port + Resend adapter (escalations, invitations)
│   ├── supabase_client.py  supabase_query.py
│   └── llm/                LLM port + Gemini adapter
├── scripts/                dev scripts: `uv run python -m scripts.<name>`
└── tests/
    ├── features/<feature>/ unit and API tests per feature
    ├── shared/             tests for shared/
    ├── fakes/              in-memory fakes of every repository port
    ├── smoke/              refactor safety net (API contract, demo-mode snapshot)
    └── architecture/       runs import-linter

frontend/
├── src/
│   ├── app/                routing only: layouts + one-line page stubs, plus _shell/AppShell.tsx (brand app)
│   ├── features/<feature>/ one folder per feature (kebab-case)
│   │   ├── <Name>Page.tsx  page components (default export)
│   │   ├── components/  hooks/  constants/  utils/  services/
│   │   └── index.ts        public API: only what other features import (optional)
│   ├── shared/
│   │   ├── components/ui/  primitives used by 2+ features
│   │   ├── lib/            api-client, api-types (generated), session, formatting, status colours
│   │   └── constants/
│   └── styles/globals.css
└── tests/
    ├── smoke/              route-manifest check (run after `npm run build`)
    └── e2e/                Playwright flows for both roles against a demo-mode backend
```

Route files only re-export. `src/app/(brand)/deals/[id]/page.tsx` contains only:

```tsx
export { default } from "@/features/deals/DealDetailPage";
```

### Two app shells

| Who | Routes | Shell |
|---|---|---|
| Brands | `src/app/(brand)/…` (`/brand`, `/deals/[id]`, `/contracts`, …) | `src/app/_shell/AppShell.tsx`; brand pages render only for non-creator sessions, creators are redirected to `/dashboard` |
| Creators (and, from Phase 6, invited team members) | `src/app/dashboard/[workspace]/…` | `features/workspaces/WorkspaceShell.tsx`: sidebar, ⌘K, workspace context (`useWorkspace()`), page header (`PageHeader`) |

Creator pages live in their feature (e.g. `features/content/HomePage.tsx`), read the active workspace with
`useWorkspace()` from `@/features/workspaces`, and call `/workspaces/{workspace}/…` endpoints with `workspace.slug`.
The sidebar lists only pages that exist (`features/workspaces/constants/nav.ts`). The UI is light only and uses the
colour tokens in `src/styles/globals.css` — no new palettes. Modals use `shared/components/ui/Dialog.tsx` (native `<dialog>`).

## Layers inside a backend feature

`router → service → (models, rules, repository ports)`

import-linter enforces this order inside every feature (`backend/.importlinter`, contract `feature-layers`):
- a lower layer may never import a higher one;
- `shared` may never import `features`.

`tests/architecture/test_layering.py` runs the linter as part of pytest. Layers are optional per feature. Wiring modules (`dependencies`, `supabase_repository`, `*_adapter`) are composition code and aren't part of the layer list.

The one documented exception: `shared/llm/gemini_adapter.py` imports `ClauseInput` from contract-intelligence, because that model is Gemini's structured-output schema.

## Import rules

1. **Within a feature:**
   - backend: absolute `features.<feature>.<module>`;
   - frontend: relative `./…`.
2. **Across features, through the index:**
   - backend: `from features.deals import Deal, DealService`;
   - frontend: `import { DELIVERABLE_STATUS_LABEL } from "@/features/deliverables"`.
3. **Indexes export only the domain API:** models, rules, repository ports, services, constants and hooks. They **never** export wiring modules. Importing a wiring module through an index pulls in Supabase, the demo store and other features' code, which creates import cycles; the import-linter contract caught exactly that during the restructure.
4. **Composition roots import wiring modules directly:**
   - backend: `router.py` and `dependencies.py` import `features.<x>.supabase_repository`, `features.<x>.dependencies` and `*_adapter` modules;
   - `main.py` and the tests import `features.<x>.router`;
   - frontend: the route stubs in `src/app/` import page modules directly, which keeps each route's client bundle limited to its own page.
5. **Aliases:** the frontend uses `@/` (→ `frontend/src/`). There are no `../../` imports.

## The shared-vs-feature rule

A file belongs in `shared/` **only** when two or more features use it. Otherwise it lives in its feature, even if it looks generic. For example, `ClauseCard` is only used by contract-intelligence, and the deliverable status labels belong to `deliverables`, which exports them for `deals`.

## Cross-cutting behaviour

| Concern | Where it lives |
|---|---|
| Config / env vars | one root `.env` (see `/.env.example`): backend `shared/config.py` loads it by absolute path; `frontend/next.config.ts` loads it for Next (`NEXT_PUBLIC_*` only reach the browser) |
| Authentication | backend `features/auth/dependencies.py` (`get_current_actor`, `get_current_brand`, `get_current_user_id`); frontend `shared/lib/session.ts` + bearer middleware in `api-client.ts` |
| Google sign-in | `GoogleButton` → Supabase `/auth/v1/authorize?provider=google&redirect_to=<origin>/auth/callback` → `OAuthCallbackPage` reads the tokens from the URL fragment → `POST /auth/creator/oauth` → same `AuthSession` as password login. Supabase **Redirect URLs** must list `<origin>/auth/callback` for every frontend origin |
| Errors → HTTP | services raise `shared/errors.py` exceptions. Routers translate them with `with map_errors({ExceptionType: status}, by_message={...})`, so each route says exactly what it maps |
| Database access | `supabase_repository.py` per feature, using `run_query()` / `first_or_none()` from `shared/supabase_query.py` |
| Demo mode | every Supabase repository inherits `DemoFallbackMixin`; see `features/demo_mode/` |
| Logging | standard `logging.getLogger(__name__)` per module (backend) |
| Formatting / lint | backend: `ruff format`, `ruff check` (config in `pyproject.toml`), `mypy`, `lint-imports`. Frontend: `npm run format` (Prettier), `npm run lint` (ESLint), `npx tsc --noEmit` |

## Product rules

- Creator OS is **free for everyone** (MVP): there is no plan, trial, subscription or billing code or data. Do not add
  plan checks; the only limit is the fair-use cap `MAX_WORKSPACES_PER_OWNER` (3) in `features/workspaces/rules.py`.
- No social-platform posting and no payment gateway are integrated.

## Access control (read before adding an endpoint)

- Every endpoint except sign-up/login and the static sample PDF requires a session: `Depends(get_current_actor)`
  (or `get_current_brand`). `backend/tests/smoke/test_api_contract.py` lists the public routes; adding one there is a deliberate decision.
- Anything scoped to a deal or contract **must** go through `load_accessible_deal(deal_id, actor)`
  (`features/deals/dependencies.py`) or `load_accessible_contract(contract_id, actor)` (`features/contracts/dependencies.py`).
  Child records (deliverables, payments, escalations) are loaded first and checked through their parent —
  never trust a `deal_id` / `contract_id` sent by the client. The rule itself is `deals.can_access_deal`.
- Workspace routes that read or change data **must** use `require_permission("<permission>", ...)` (any-of) from
  `features/workspaces/dependencies.py`; refusals are written to the audit log. Add the matching `anyOf` to the page's
  nav entry in `features/workspaces/constants/nav.ts` so the sidebar and the "no access" panel agree with the API.
  Owner-only actions (roles, removing members, role permissions) are checked in `TeamService`.
- Anything inside a workspace **must** depend on `require_workspace_member` (`features/workspaces/dependencies.py`), which
  resolves the slug or id and returns 404 (unknown) / 403 (not a member). Look child records up **within** that
  workspace (`ContentService.update` returns 404 for an item of another workspace). Workspace routes use
  `get_current_user_id`, not `get_current_actor`, because invited members have no brand/creator profile.
- AI endpoints go through `AiAssistService`, which applies the per-workspace rate limit (429) and turns a missing or failing
  provider into 503; never call the LLM directly from a router.
- Demo accounts work only when `features.demo_mode.demo_access_enabled()` is true (offline demo dataset, not production).
- Tests: `tests/features/auth/test_access_control_api.py` (cross-tenant 403s). Add a case for every new scoped endpoint;
  API tests point the access checks at fakes with `tests/fakes/access.py::use_fake_access_repos`.

## Naming conventions

| Thing | Convention | Example |
|---|---|---|
| Frontend folders | kebab-case | `contract-intelligence/` |
| Python packages | snake_case | `contract_intelligence/` |
| Backend modules in a feature | role names | `router.py`, `service.py`, `rules.py` |
| React components and pages | PascalCase, one per file, file = component | `DealDetailPage.tsx`, `ClauseCard.tsx` |
| Hooks | `useCamelCase.ts` | `useUnreadMessages.ts` |
| Other TS files | kebab-case, role suffix where useful | `deal-stages.ts`, `find-highlights.utils.ts`, `format-currency.ts` |
| Constants | `UPPER_SNAKE_CASE` | `DEAL_STAGE_LABEL`, `MAX_PAGE_SIZE` |
| Python tests | `test_<feature>_<unit>.py` | `test_deals_service.py`, `test_payments_api.py` |
| Banned file names | `helper`, `utils2`, `misc`, `temp`, `new`, `final`, `data`, `repos` | |

API paths are a public contract. They were left unchanged by the restructure and must not be renamed casually; `backend/tests/smoke/test_api_contract.py` will fail if they change.

## How to add a new feature

Example: `content-calendar`.

1. **Backend:** create `backend/features/content_calendar/` with `models.py`, `repository.py` (Protocol), `supabase_repository.py` (inherit `DemoFallbackMixin` and use `run_query`), `service.py` and `router.py`. Add `__init__.py`, exporting only what other features need.
2. Register the router in `backend/main.py` (`from features.content_calendar.router import router as content_calendar_router`, then `app.include_router(...)`).
3. Add `features.content_calendar` to the `containers` list in `backend/.importlinter`.
4. If demo mode should cover it, add an in-memory repository in `features/demo_mode/in_memory_repositories.py`, register it in `DemoStore`, and seed it in `seed.py`.
5. Add tests in `backend/tests/features/content_calendar/`, plus a fake in `tests/fakes/fake_repos.py` if a service needs one. Update `tests/smoke/test_api_contract.py` with the new routes.
6. Write a migration in `supabase/migrations/` if you add tables.
7. **Frontend:** run `npm run generate:api` with the backend running to refresh `src/shared/lib/api-types.ts`.
8. Create `frontend/src/features/content-calendar/ContentCalendarPage.tsx` and its `components/` etc., and add the route stub `src/app/(brand)/content-calendar/page.tsx`:
   ```tsx
   export { default } from "@/features/content-calendar/ContentCalendarPage";
   ```
9. Add the URL to `frontend/tests/smoke/routes.snapshot.json` and a nav entry: creator pages go under
   `src/app/dashboard/[workspace]/` with an entry in `features/workspaces/constants/nav.ts`; brand pages under
   `src/app/(brand)/` with an entry in `src/app/_shell/AppShell.tsx`. Add an e2e step in `frontend/tests/e2e/app-flows.spec.ts`.
10. Add the feature to [FEATURES.md](FEATURES.md).

## Verification commands

```bash
# backend (from backend/)
uv run pytest -q              # includes tests/architecture (import-linter) and tests/smoke
uv run lint-imports
uv run ruff check . && uv run ruff format --check .
uv run mypy .

# frontend (from frontend/)
npx tsc --noEmit
npm run lint
npm run format:check
npm run build && npm run test:smoke

# end-to-end (browser): backend in demo mode on :8000, production frontend on :3100
cd backend && SUPABASE_URL=http://dummy.invalid SUPABASE_SERVICE_ROLE_KEY=dummy SUPABASE_ANON_KEY=dummy \
  uv run uvicorn main:app --port 8000
cd frontend && npm run build && npx next start -p 3100
npx playwright install chromium   # once
E2E_BASE_URL=http://127.0.0.1:3100 npm run test:e2e
```
