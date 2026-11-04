# CreatorOS — AI-Powered Creator Deal Management Platform

CreatorOS is an end-to-end platform designed for content creators and brands to manage sponsorship deals, rate benchmarks, brief parsing, AI contract clause analysis & red-flag detection, deliverable workflows, and payments.

---

## 1. Project Architecture

The repository is organized into modern full-stack services:

```
├── backend/         # FastAPI backend (Python 3.13, Hexagonal Architecture)
│   ├── domain/      # Pure business models & logic (deals, contracts, payments, flags)
│   ├── application/ # Orchestration services (clause analysis, negotiations, messages)
│   ├── infrastructure/ # External adapters (Supabase, Gemini AI, Resend)
│   └── interface/   # FastAPI HTTP routes & schemas
├── frontend/        # Next.js 16 frontend (React 19, TypeScript, App Router)
├── packages/        # Shared libraries and schemas
└── supabase/        # Database migrations & schemas
```

---

## 2. Tech Stack

- **Frontend**: Next.js 16 (App Router, Turbopack), React 19, TypeScript, `openapi-fetch`, Tailwind CSS.
- **Backend**: FastAPI (Python 3.13), Pydantic v2, `uv` package manager.
- **Database & Auth**: Supabase (PostgreSQL + GoTrue Auth).
- **AI & Intelligence**: Google Gemini API (`gemini-2.5-flash`) for contract clause intelligence, negotiation assistance, and script generation.

---

## 3. Local Development Setup

### Prerequisites
- Node.js 18+ & npm
- Python 3.13+ & [`uv`](https://docs.astral.sh/uv/)

### Backend Setup
```bash
cd backend

# Install dependencies with uv
uv sync

# Run development server
uv run uvicorn main:app --reload --port 8000
```
- API server runs at: `http://localhost:8000`
- Interactive OpenAPI Swagger docs: `http://localhost:8000/docs`

### Frontend Setup
```bash
cd frontend

# Install dependencies
npm install

# Run development server
npm run dev
```
- Web application runs at: `http://localhost:3000`

---

## 4. API Client & Code Generation

The frontend uses type-safe contracts generated directly from FastAPI's OpenAPI specification:

```bash
cd frontend
npm run generate:api
```
This updates `frontend/lib/api-types.ts` from `http://localhost:8000/openapi.json`.
