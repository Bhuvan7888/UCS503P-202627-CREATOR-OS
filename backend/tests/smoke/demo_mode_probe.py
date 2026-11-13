"""Exercise the API end-to-end in demo mode (in-memory data, no network) and summarise responses.

Used by test_demo_mode_contract.py. The summary keeps only stable facts (status code, item count,
sorted keys) because the demo seed uses random UUIDs and the current time.
"""

from typing import Any

from fastapi.testclient import TestClient

BRAND_EMAIL = "demo.brand1@creatoros.dev"
CREATOR_EMAIL = "demo.creator1@creatoros.dev"
DEMO_PASSWORD = "DemoPass123!"


def _shape(response: Any) -> dict[str, Any]:
    out: dict[str, Any] = {"status": response.status_code}
    try:
        body = response.json()
    except ValueError:
        out["content_type"] = response.headers.get("content-type", "").split(";")[0]
        return out
    if isinstance(body, list):
        out["count"] = len(body)
        if body and isinstance(body[0], dict):
            out["keys"] = sorted(body[0])
    elif isinstance(body, dict):
        out["keys"] = sorted(body)
    else:
        out["type"] = type(body).__name__
    return out


def collect(client: TestClient) -> dict[str, Any]:
    result: dict[str, Any] = {}

    def login(role: str, email: str) -> dict[str, str]:
        r = client.post(f"/auth/{role}/login", json={"email": email, "password": DEMO_PASSWORD})
        result[f"POST /auth/{role}/login"] = _shape(r)
        return {"Authorization": f"Bearer {r.json()['access_token']}"}

    def get(label: str, path: str, headers: dict[str, str] | None = None) -> Any:
        r = client.get(path, headers=headers or {})
        result[label] = _shape(r)
        try:
            return r.json()
        except ValueError:
            return None

    brand = login("brand", BRAND_EMAIL)
    creator = login("creator", CREATOR_EMAIL)

    for role, h in (("brand", brand), ("creator", creator)):
        deals = get(f"{role} GET /deals", "/deals", h)
        contracts = get(f"{role} GET /contracts", "/contracts", h)
        get(f"{role} GET /deliverables", "/deliverables", h)
        get(f"{role} GET /payments", "/payments", h)
        get(f"{role} GET /activity-log", "/activity-log", h)
        get(f"{role} GET /messages/unread", "/messages/unread", h)
        if contracts:
            cid = contracts[0]["id"]
            get(f"{role} GET /contracts/{{id}}", f"/contracts/{cid}", h)
            get(f"{role} GET /contracts/{{id}}/clauses", f"/contracts/{cid}/clauses", h)
        if deals:
            result[f"{role} deals statuses"] = sorted(d["status"] for d in deals)

    creators = get("brand GET /creators", "/creators", brand)
    get("brand GET /analytics/brand", "/analytics/brand", brand)
    if creators:
        get("GET /creators/{id}", f"/creators/{creators[0]['id']}", brand)
        get("brand GET /messages?with_id", f"/messages?with_id={creators[0]['id']}", brand)
    get("creator GET /creators/me/brands", "/creators/me/brands", creator)
    get("GET /contracts/sample-contract-pdf", "/contracts/sample-contract-pdf")
    return result
