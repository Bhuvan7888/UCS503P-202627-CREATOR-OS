"""Measure server-side latency of the busiest API routes against the real database.

Creates a temporary user (needs the service-role key in the root .env), times each route (median and p95 of
RUNS calls, in-process so the numbers are server time including database round trips), then deletes the user.

    uv run python -m scripts.perf_check
"""

import secrets
import statistics
import time
import uuid

from fastapi.testclient import TestClient

from main import app
from shared.supabase_client import get_supabase_client

RUNS = 10


def main() -> None:
    admin = get_supabase_client(service_role=True, fresh=True)
    client = TestClient(app)
    email, password = f"perf-{uuid.uuid4().hex[:8]}@example.com", secrets.token_urlsafe(16) + "A1!"
    user = admin.auth.admin.create_user(
        {"email": email, "password": password, "email_confirm": True}
    )
    try:
        session = (
            get_supabase_client(service_role=True, fresh=True)
            .auth.sign_in_with_password({"email": email, "password": password})
            .session
        )
        h = {"Authorization": f"Bearer {session.access_token}"}
        client.post("/auth/creator/oauth", headers=h, json={"refresh_token": session.refresh_token})
        w = "/workspaces/" + client.get("/workspaces", headers=h).json()[0]["slug"]
        item = client.post(
            f"{w}/content", headers=h, json={"title": "perf", "pillar": "p", "hook": "h"}
        ).json()
        stages = ["scripted", "idea"]
        routes = {
            "GET /workspaces": lambda i: client.get("/workspaces", headers=h),
            "GET /workspaces/{ws}": lambda i: client.get(w, headers=h),
            "GET content": lambda i: client.get(f"{w}/content", headers=h),
            "GET content/stats": lambda i: client.get(f"{w}/content/stats", headers=h),
            "PATCH content (move)": lambda i: client.patch(
                f"{w}/content/{item['id']}", headers=h, json={"stage": stages[i % 2]}
            ),
            "PUT script (autosave)": lambda i: client.put(
                f"{w}/content/{item['id']}/script", headers=h, json={"body": f"v{i}"}
            ),
            "GET notifications/unread": lambda i: client.get(
                f"{w}/notifications/unread-count", headers=h
            ),
            "GET crm/deals": lambda i: client.get(f"{w}/crm/deals", headers=h),
            "GET approvals": lambda i: client.get(f"{w}/approvals", headers=h),
        }
        print(f"{'route':28} {'median ms':>10} {'p95 ms':>8}")
        for name, call in routes.items():
            call(0)  # warm up
            times = []
            for i in range(RUNS):
                start = time.perf_counter()
                res = call(i)
                times.append((time.perf_counter() - start) * 1000)
                assert res.status_code < 400, (name, res.status_code, res.text[:200])
            times.sort()
            print(f"{name:28} {statistics.median(times):10.0f} {times[int(RUNS * 0.95) - 1]:8.0f}")
    finally:
        admin.table("creators").delete().eq("user_id", user.user.id).execute()
        admin.auth.admin.delete_user(user.user.id)


if __name__ == "__main__":
    main()
