# Creator OS

Creator OS is a deal-management platform for brands and the creators they work with. It covers the full lifecycle of a sponsorship in one place: onboarding and data-backed rate negotiation, contracts with automatic red-flag clause scanning, deliverables, invoices and payments, chat, analytics, and an activity log.

- **Backend:** FastAPI (Python 3.13, `uv`) on Supabase (Postgres, Auth, Storage), Google Gemini for AI features, Resend for email
- **Frontend:** Next.js 16 (App Router, Turbopack), React 19, TypeScript, Tailwind CSS v4, and a typed API client generated from the backend's OpenAPI schema

## Features

| Feature | What it does | Main URLs |
|---|---|---|
| `auth` | Brand and creator sign-up and login, sessions, demo accounts | `/brand/login`, `/creator/login`, `/brand/signup`, `/creator/signup` |
| `deals` | Brand deal pipeline, deal workspace, creator Kanban board | `/brand`, `/deals/[id]`, `/creator/board` |
| `creators` | Creator roster and profiles, brand linking, growth snapshots | `/creators/[id]` |
| `creator-dashboard` | Creator home: stats, deals, brands, contracts, benchmarks | `/creator` |
| `negotiation` | Fair-rate range, growth forecast, checklist, counter-offers, AI chat and scripts | `/creator/negotiate/[dealId]` |
| `contracts` | Contract upload, status lifecycle, sample contract | `/contracts` |
| `contract-intelligence` | Red-flag clause scanning, AI explanations, escalations | `/contracts/[id]/clauses` |
| `deliverables` | Deliverables and their production workflow | `/deliverables` |
| `payments` | Invoices, platform fees, payment status | `/payments` |
| `messages` | Brand ↔ creator chat with an unread indicator | `/chat` |
| `analytics` | Revenue, pipeline, top campaigns, creator performance | `/analytics` |
| `activity-log` | Audit trail of actions | `/activity` |
| `benchmarks` | Market rate percentiles (API only) | `GET /benchmarks` |
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

### Backend
```bash
cd backend
cp .env.example .env      # fill in Supabase, Gemini and Resend values
uv sync                   # installs runtime + dev tools (pytest, ruff, mypy, import-linter)
uv run uvicorn main:app --reload --port 8000
```
- API: http://localhost:8000. Interactive docs: http://localhost:8000/docs
- **Demo mode:** if Supabase is unreachable, or the keys contain `dummy`, the API runs on a seeded in-memory dataset. Log in with any demo account (`demo.brand1@creatoros.dev` … `demo.brand3@…`, `demo.creator1@creatoros.dev` … `demo.creator5@…`, password `DemoPass123!`).
- **Demo data in a real Supabase project:** `uv run python -m scripts.reset_demo`, then `uv run python -m scripts.seed_demo`.

### Frontend
```bash
cd frontend
cp .env.example .env.local   # NEXT_PUBLIC_API_URL (defaults to http://127.0.0.1:8000)
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

CI (`.github/workflows/ci.yml`) runs the backend tests, the frontend type check and the frontend lint on every PR.

## Known issues

See `AUDIT.md` §1.5. The demo-account login and token bypass is active in every environment, and several endpoints have no authentication. Both are scheduled for a dedicated security fix.
