"""Load test: N concurrent users working in their own workspaces, against a running backend + the real database.

Each virtual user opens its workspace, then loops a realistic session — load content and stats, add an idea,
move a card, autosave a script, check the CRM and notifications — with a short pause between actions. Prints
latency per route and every error, then deletes all temporary users (deleting a login cascades their workspaces).

Supabase rate-limits password sign-ins per IP, so users share --accounts temporary accounts (default users/4):
several sessions per account working in the same workspace, like teammates. The server sees the same load.

    uv run uvicorn main:app --port 8001            # in another terminal (real .env)
    uv run python -m scripts.load_test --users 100 --duration 60 --base-url http://127.0.0.1:8001
"""

import argparse
import asyncio
import random
import secrets
import statistics
import time
import uuid
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor

import httpx

from shared.supabase_client import get_supabase_client

CREATED: list[str] = []  # every temporary user id, recorded at once so cleanup never misses one


def _make_account(_: int) -> tuple[str, str]:
    """(access token, refresh token) for a fresh temporary account."""
    admin = get_supabase_client(service_role=True)
    email, password = f"load-{uuid.uuid4().hex[:10]}@example.com", secrets.token_urlsafe(16) + "A1!"
    user = admin.auth.admin.create_user(
        {"email": email, "password": password, "email_confirm": True}
    )
    CREATED.append(user.user.id)
    auth = get_supabase_client(service_role=True, fresh=True).auth
    session = auth.sign_in_with_password({"email": email, "password": password}).session
    assert session is not None
    return session.access_token, session.refresh_token


async def _session(
    http: httpx.AsyncClient,
    token: str,
    deadline: float,
    think: tuple[float, float],
    stats: dict,
    errors: list,
    start_delay: float = 0.0,
) -> None:
    await asyncio.sleep(start_delay)  # users arrive over the ramp-up, not all in one instant
    h = {"Authorization": f"Bearer {token}"}

    async def call(name: str, method: str, url: str, **kw) -> httpx.Response | None:
        start = time.perf_counter()
        try:
            res = await http.request(method, url, headers=h, **kw)
        except httpx.HTTPError as e:
            errors.append(f"{name}: {type(e).__name__}")
            return None
        stats[name].append((time.perf_counter() - start) * 1000)
        if res.status_code >= 400:
            errors.append(f"{name}: HTTP {res.status_code} {res.text[:80]}")
        return res

    res = await call("GET /workspaces", "GET", "/workspaces")
    if res is None or res.status_code != 200 or not res.json():
        return
    w = f"/workspaces/{res.json()[0]['slug']}"
    await call("GET /workspaces/{ws}", "GET", w)
    item_id = None
    i = 0
    while time.perf_counter() < deadline:
        i += 1
        await call("GET content", "GET", f"{w}/content")
        await call("GET content/stats", "GET", f"{w}/content/stats")
        if item_id is None or i % 5 == 0:
            body = {"title": f"Idea {i}", "pillar": "p", "hook": "h"}
            made = await call("POST content", "POST", f"{w}/content", json=body)
            if made is not None and made.status_code == 201:
                item_id = made.json()["id"]
        if item_id:
            stage = random.choice(["idea", "scripted", "scheduled"])
            await call(
                "PATCH content (move)", "PATCH", f"{w}/content/{item_id}", json={"stage": stage}
            )
            await call(
                "PUT script (autosave)",
                "PUT",
                f"{w}/content/{item_id}/script",
                json={"body": f"v{i}"},
            )
        await call("GET crm/deals", "GET", f"{w}/crm/deals")
        await call("GET notifications/unread", "GET", f"{w}/notifications/unread-count")
        await asyncio.sleep(random.uniform(*think))


def _report(stats: dict[str, list[float]], errors: list[str], elapsed: float) -> None:
    total = sum(len(v) for v in stats.values())
    print(
        f"\n{total} requests in {elapsed:.0f}s ({total / elapsed:.1f} req/s), {len(errors)} errors\n"
    )
    print(f"{'route':28} {'count':>6} {'median ms':>10} {'p95 ms':>8} {'max ms':>8}")
    for name, times in stats.items():
        times.sort()
        p95 = times[max(0, int(len(times) * 0.95) - 1)]
        print(
            f"{name:28} {len(times):6} {statistics.median(times):10.0f} {p95:8.0f} {times[-1]:8.0f}"
        )
    for e in sorted(set(errors))[:20]:
        print("  error:", e, f"(x{errors.count(e)})")


async def run(
    users: int,
    accounts: int,
    duration: int,
    base_url: str,
    think: tuple[float, float],
    ramp: float,
) -> None:
    stats: dict[str, list[float]] = defaultdict(list)
    errors: list[str] = []
    try:
        print(f"Creating {accounts} temporary accounts for {users} concurrent users…")
        with ThreadPoolExecutor(4) as pool:
            sessions = list(pool.map(_make_account, range(accounts)))
        limits = httpx.Limits(max_connections=users * 2, max_keepalive_connections=users * 2)
        async with httpx.AsyncClient(base_url=base_url, timeout=30, limits=limits) as http:
            # finish each account's sign-up (creator profile + workspace) before its sessions start
            for _token, refresh in sessions:
                await http.post(
                    "/auth/creator/oauth",
                    headers={"Authorization": f"Bearer {_token}"},
                    json={"refresh_token": refresh},
                )
            print(f"Running {users} concurrent users for {duration}s against {base_url}…")
            started = time.perf_counter()
            deadline = started + duration
            await asyncio.gather(
                *(
                    _session(
                        http,
                        sessions[i % accounts][0],
                        deadline,
                        think,
                        stats,
                        errors,
                        ramp * i / users,
                    )
                    for i in range(users)
                )
            )
            _report(stats, errors, time.perf_counter() - started)
    finally:
        print("\nDeleting temporary users…")
        admin = get_supabase_client(service_role=True)

        def cleanup(user_id: str) -> None:
            admin.table("creators").delete().eq("user_id", user_id).execute()
            admin.auth.admin.delete_user(user_id)

        with ThreadPoolExecutor(16) as pool:
            list(pool.map(cleanup, CREATED))
        print(f"Deleted {len(CREATED)} users.")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--users", type=int, default=100)
    parser.add_argument("--accounts", type=int, default=0, help="default: users / 4")
    parser.add_argument("--duration", type=int, default=60)
    parser.add_argument("--base-url", default="http://127.0.0.1:8001")
    parser.add_argument(
        "--think",
        type=float,
        nargs=2,
        default=(0.5, 1.5),
        metavar=("MIN", "MAX"),
        help="pause between rounds in seconds (default 0.5 1.5 = stress; a person is closer to 4 8)",
    )
    parser.add_argument("--ramp", type=float, default=15, help="seconds over which users arrive")
    args = parser.parse_args()
    accounts = args.accounts or max(1, args.users // 4)
    asyncio.run(
        run(args.users, accounts, args.duration, args.base_url, tuple(args.think), args.ramp)
    )


if __name__ == "__main__":
    main()
