# Creator OS

Creator OS has two sides, free for everyone:

- **Creators** get a workspace to plan content from idea to published: Home with KPIs, a Content Pipeline kanban, a 5-step Add Content wizard, Scripts, a Calendar, Approvals, a Brand CRM and AI help (Gemini) (more pages arrive phase by phase — see [docs/PROGRESS.md](docs/PROGRESS.md)).
- **Brands** manage sponsorship deals: creator onboarding, contracts with automatic red-flag clause scanning, deliverables, invoices and payments, chat, analytics, and an activity log.

- **Backend:** FastAPI (Python 3.13, `uv`) on Supabase (Postgres, Auth incl. Google sign-in, Storage), Google Gemini for AI features, Resend for email
- **Frontend:** Next.js 16 (App Router, Turbopack), React 19, TypeScript, Tailwind CSS v4, and a typed API client generated from the backend's OpenAPI schema

## Features

| Feature | What it does | Main URLs |
|---|---|---|
| `auth` | Brand and creator sign-up and login (creators: email/password or Google), sessions, demo accounts | `/brand/login`, `/creator/login`, `/brand/signup`, `/creator/signup`, `/auth/callback` |
| `workspaces` | Creator workspace shell (switcher, sidebar, ⌘K), team: invites, roles and permissions, audit log | `/dashboard`, `/dashboard/[workspace]`, `/dashboard/[workspace]/settings/workspace`, `/invite/[token]` |
| `content` | Home KPIs, Content Pipeline kanban, Add Content wizard, item editor, Scripts with auto-save, Calendar | `/dashboard/[workspace]`, `/dashboard/[workspace]/kanban`, `/dashboard/[workspace]/scripts` |
| `contract-intelligence` (creator side) | Contracts from brand deals with the red-flag clause review | `/dashboard/[workspace]/contracts` |
| `account` | Profile and notification preferences | `/dashboard/[workspace]/settings/profile`, `/dashboard/[workspace]/settings/notifications` |
| `notifications` | Bell and inbox fed by workspace events | `/dashboard/[workspace]/notifications` |
| `support` | Help tickets and FAQ | `/dashboard/[workspace]/support` |
| `integrations` | API keys for agents (scoped, audited) and signed webhooks | `/dashboard/[workspace]/settings/api-keys`, `/dashboard/[workspace]/settings/webhooks` |
| `crm` | Brand CRM: own deals, KPIs, New Deal wizard, Creator OS brand deals | `/dashboard/[workspace]/crm` |
| `approvals` | Publish requests approved or rejected by a person | `/dashboard/[workspace]/approvals` |
| `ai-assist` | AI knowledge, Generate Title/Description/Hook/outline, AI Content Suggestions | `/dashboard/[workspace]/ai-suggestions`, `/dashboard/[workspace]/settings/ai-knowledge` |
| `deals` | Brand deal pipeline and deal workspace | `/brand`, `/deals/[id]` |
| `creators` | Creator roster and profiles, brand linking | `/creators/[id]` |
| `contracts` | Contract upload, status lifecycle, sample contract PDF | `/contracts` |
| `contract-intelligence` | Red-flag clause scanning, AI explanations, escalations | `/contracts/[id]/clauses` |
| `deliverables` | Deliverables and their production workflow | `/deliverables` |
| `payments` | Invoices, platform fees, payment status | `/payments` |
| `messages` | Brand ↔ creator chat with an unread indicator | `/chat` |
| `analytics` | Revenue, pipeline, top campaigns, creator performance | `/analytics` |
| `activity-log` | Audit trail of actions | `/activity` |
| `demo-mode` | Seeded in-memory dataset when Supabase is unavailable | demo logins |
| `landing` | Public landing page | `/` |

**Where to look:**
- [docs/FEATURES.md](docs/FEATURES.md) maps every feature to its backend folder, frontend folder, endpoints and pages.
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) covers the folder structure, import and layering rules, naming conventions, and how to add a feature.

## Repository layout

```
backend/            FastAPI app: features/<feature>/, shared/, scripts/, tests/
frontend/           Next.js app: src/app (routing), src/features/<feature>/, src/shared/
supabase/migrations SQL schema (apply in the Supabase SQL editor)
docs/               ARCHITECTURE.md, FEATURES.md, PROGRESS.md (history), archive/
```

## Setup

### Prerequisites
- Python 3.13 and [`uv`](https://docs.astral.sh/uv/)
- Node.js 20+ (CI uses 22) and npm

### Environment (one file)
```bash
cp .env.example .env      # at the repo root: Supabase, Gemini, Resend and the NEXT_PUBLIC_* values
```
Both apps read this single root `.env`; there are no per-app env files.

### Backend
```bash
cd backend
uv sync                   # installs runtime + dev tools (pytest, ruff, mypy, import-linter)
uv run uvicorn main:app --reload --port 8000
```
- API: http://localhost:8000. Interactive docs: http://localhost:8000/docs
- **Demo mode:** if Supabase is unreachable, or the keys contain `dummy`, the API runs on a seeded in-memory dataset (never when `ENVIRONMENT=production`). Log in with any demo account (`demo.brand1@creatoros.dev` … `demo.brand3@…`, `demo.creator1@creatoros.dev` … `demo.creator5@…`, password `DemoPass123!`).
- **Demo data in a real Supabase project:** `uv run python -m scripts.reset_demo`, then `uv run python -m scripts.seed_demo`.

### Frontend
```bash
cd frontend
npm install
npm run dev                  # http://localhost:3000
```

### Regenerating the API types
After changing backend models or routes, start the backend and run:
```bash
cd frontend && npm run generate:api   # writes src/shared/lib/api-types.ts
```

## Checks

| | Command (run in the app folder) |
|---|---|
| Backend tests (incl. architecture and smoke tests) | `uv run pytest -q` |
| Backend layering | `uv run lint-imports` |
| Backend lint / format / types | `uv run ruff check .` · `uv run ruff format --check .` · `uv run mypy .` |
| Frontend types / lint / format | `npx tsc --noEmit` · `npm run lint` · `npm run format:check` |
| Frontend build + route smoke test | `npm run build && npm run test:smoke` |
| End-to-end browser flows (both roles, demo mode) | `E2E_BASE_URL=http://127.0.0.1:3100 npm run test:e2e`; see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md#verification-commands) |

CI (`.github/workflows/ci.yml`) runs the backend tests, the frontend type check and the frontend lint on every PR.

## Deploying

1. **Database:** run every file in `supabase/migrations/` in the Supabase SQL Editor, in filename order (the
   creator-workspace ones are `20261113000000_…` to `20261119000000_…`; all are safe to re-run). Run new migrations
   **before** deploying a backend that needs them.
2. **Backend environment** (see `/.env.example`): `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`,
   `ENVIRONMENT=production`, `GEMINI_API_KEY`, `GEMINI_MODEL_FLASH`, `GEMINI_MODEL_FALLBACK` (optional),
   `TRANSACTIONAL_EMAIL_API_KEY` (Resend), `APP_URL` (public frontend address, used in invitation emails),
   `SUPPORT_EMAIL` (optional). Start command: `uv run uvicorn main:app --host 0.0.0.0 --port $PORT`;
   health check: `GET /health`.
3. **Frontend environment:** `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
   Supabase → Authentication → URL Configuration → Redirect URLs must include `<frontend>/auth/callback`.
4. **Speed:** host the backend in the same region as the Supabase project. Every request makes 1–2 database round
   trips; across regions each costs ~190 ms, in the same region ~2–5 ms.
5. **Email:** Resend's test sender only delivers to the Resend account owner; verify a domain in Resend and set the
   sender in `backend/shared/email/resend_adapter.py` for invitations and notifications to reach everyone.

Performance tools (from `backend/`, real `.env`): `uv run python -m scripts.perf_check` (per-route latency) and
`uv run python -m scripts.load_test --users 100 --duration 60 --think 4 8` against a running backend (concurrent
users; temporary accounts are always deleted).

## Security notes

- Demo accounts work only in offline demo mode and never when `ENVIRONMENT=production`; every endpoint except sign-up/login and the sample PDF needs a session, and deal/contract data is checked per tenant (see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md#access-control-read-before-adding-an-endpoint)).
- Database tables have row-level security on with no policies: only the backend (service-role key) can read or write them.
- Workspace routes check the caller's permissions server-side; API keys are scoped, hashed and audited; webhook URLs
  must be public https (no internal addresses); invitation and API-key secrets are stored only as hashes.
- Frontend pages send security headers (no framing, no MIME sniffing, HSTS, strict referrer, no camera/mic/location).
- Dependency audits (2026-11-14): `npm audit --omit=dev` and `pip-audit` report no known vulnerabilities.
