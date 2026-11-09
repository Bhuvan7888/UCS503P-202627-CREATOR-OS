# CreatorOS — Feature Specification

## Overview

CreatorOS is an AI-powered platform for digital creators and influencers to manage the full lifecycle of brand deals — from rate negotiation and contract analysis to performance tracking, invoicing, and brand collaboration portals.

---

## Core Modules

### 1. Dashboard

- **Overview KPIs**: Total earnings YTD, active deals count, pending invoice total, average engagement rate
- **Recent deals table**: Brand, title, amount, status, next deadline
- **Upcoming deadlines**: Alert widget for deliverables due in 7 days
- **Quick actions**: New Deal CTA, Upload Contract

### 2. Deal Management (`/deals`)

- Create, edit, archive deals
- Deal status lifecycle: `DRAFT → NEGOTIATING → PENDING_CONTRACT → ACTIVE → COMPLETED`
- Per-deal deliverable tracking with status updates
- Exclusivity period and usage rights tracking
- Brand contact information management
- Deal tags/categories for filtering
- Link contracts and invoices to deals

### 3. Rate Intelligence (`/rate-intelligence`)

- AI-powered market rate benchmarks by niche, platform, follower range
- Historical rate trends for creator's own deals
- "Are you underpaid?" analysis based on engagement and reach
- Suggested rate card generator
- Comparable creator rate estimates

### 4. Contract Analysis (`/contracts`)

- Upload PDF/DOCX contract for AI parsing
- Automatic extraction of: parties, payment terms, exclusivity, usage rights, IP clauses
- Risk flag detection with severity (LOW / MEDIUM / HIGH / CRITICAL)
- Plain-language AI summary of the contract
- Overall risk score (0–100)
- Clause-level risk recommendations
- E-signature integration (future)

### 5. Invoicing (`/invoices`)

- Create branded invoices linked to deals
- Line items: deliverable type, quantity, rate
- Tax calculation support
- Auto-number invoice generation (`INV-YYYY-NNNN`)
- Send via email
- Payment tracking: SENT → VIEWED → PARTIALLY_PAID → PAID / OVERDUE
- Stripe payment link integration (future)

### 6. Invisible Tax (`/invisible-tax`)

- Surface hidden deductions: agency cuts, platform fees, tool subscriptions, equipment amortization
- "True rate" calculator: what the creator actually earns per hour of work
- Platform revenue share calculator (YouTube AdSense, TikTok Creator Fund, etc.)
- Tax bracket estimator for self-employed creators

### 7. Brand Portal (`/brand-portal`)

- Generate secure, time-limited access tokens for brands
- Configurable permissions per token:
  - `VIEW_DELIVERABLES` — see submitted content
  - `VIEW_PERFORMANCE` — see analytics dashboard
  - `VIEW_INVOICES` — see invoice status
  - `APPROVE_CONTENT` — mark deliverables approved
  - `DOWNLOAD_ASSETS` — download content files
- Token management: revoke, extend, audit access log

---

## Data Models (summary)

| Model              | Purpose                                              |
| ------------------ | ---------------------------------------------------- |
| `User`             | Creator / admin / brand account                      |
| `CreatorProfile`   | Platform handles, follower counts, niches, base rate |
| `Deal`             | Brand deal with amount, status, timeline             |
| `Deliverable`      | Individual content piece within a deal               |
| `Contract`         | Contract document + AI analysis results              |
| `ContractRiskFlag` | Individual risky clause identified by AI             |
| `Invoice`          | Invoice with line items and payment tracking         |
| `InvoiceLineItem`  | Single line on an invoice                            |
| `PerformanceLog`   | Time-stamped metrics snapshot for a deal/deliverable |
| `BrandPortalToken` | Secure token granting brand access                   |

---

## Tech Stack

| Layer        | Technology                                                   |
| ------------ | ------------------------------------------------------------ |
| Frontend     | Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui |
| Backend      | NestJS 10, TypeScript (strict), REST + OpenAPI               |
| Database     | PostgreSQL 16 via Prisma 5 ORM                               |
| Cache        | Redis 7                                                      |
| AI           | Google Gemini API (primary), OpenAI (fallback)               |
| File Storage | AWS S3                                                       |
| Payments     | Stripe                                                       |
| Email        | Resend                                                       |
| Auth         | JWT (Phase 0 scaffolded, Phase 1 full implementation)        |
| CI/CD        | GitHub Actions, pnpm, Turborepo                              |
| Dev Infra    | Docker Compose                                               |
