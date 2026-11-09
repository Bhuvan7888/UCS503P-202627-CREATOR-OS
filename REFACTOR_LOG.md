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
