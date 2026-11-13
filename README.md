# Creator OS

Creator OS has two sides, free for everyone:

- **Creators** get a workspace to plan content from idea to published: Home with KPIs, a Content Pipeline kanban, a 5-step Add Content wizard, Scripts and AI help (Gemini) (more pages arrive phase by phase — see [docs/PROGRESS.md](docs/PROGRESS.md)).
- **Brands** manage sponsorship deals: creator onboarding, contracts with automatic red-flag clause scanning, deliverables, invoices and payments, chat, analytics, and an activity log.

- **Backend:** FastAPI (Python 3.13, `uv`) on Supabase (Postgres, Auth incl. Google sign-in, Storage), Google Gemini for AI features, Resend for email
- **Frontend:** Next.js 16 (App Router, Turbopack), React 19, TypeScript, Tailwind CSS v4, and a typed API client generated from the backend's OpenAPI schema

## Features

| Feature | What it does | Main URLs |
|---|---|---|
| `auth` | Brand and creator sign-up and login (creators: email/password or Google), sessions, demo accounts | `/brand/login`, `/creator/login`, `/brand/signup`, `/creator/signup`, `/auth/callback` |
| `workspaces` | Creator workspace shell: switcher, sidebar, ⌘K palette | `/dashboard`, `/dashboard/[workspace]` |
| `content` | Home KPIs, Content Pipeline kanban, Add Content wizard, item editor, Scripts with auto-save | `/dashboard/[workspace]`, `/dashboard/[workspace]/kanban`, `/dashboard/[workspace]/scripts` |
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

## Security notes

- Demo accounts work only in offline demo mode and never when `ENVIRONMENT=production`; every endpoint except sign-up/login and the sample PDF needs a session, and deal/contract data is checked per tenant (see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md#access-control-read-before-adding-an-endpoint)).
- Database tables have row-level security on with no policies: only the backend (service-role key) can read or write them.
