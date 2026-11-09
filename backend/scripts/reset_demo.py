"""
Wipes every demo/test row and Auth user from the Supabase project, so
seed_demo.py can build fresh demo data on a clean slate.

Preserves exactly one thing: the real personal account a human made while
poking at the app by hand (bhuvanmalhotra555@gmail.com / creator "Bhuvan") —
everything else in this project is demo or automated-test debris. If you add
another real account later, add its email to PRESERVE_EMAILS below first.

Run from backend/, with the venv active and real Supabase credentials in .env:

    python -m scripts.reset_demo
"""
import asyncio

from shared.supabase_client import get_supabase_client

PRESERVE_EMAILS = {"bhuvanmalhotra555@gmail.com"}

# Deletion order matters — children before the parents they reference.
TABLES_IN_DELETE_ORDER = [
    "negotiation_offers",
    "negotiation_conversations",
    "escalations",
    "clause_cards",
    "payments",
    "deliverables",
    "negotiation_sessions",
    "contracts",
    "messages",
    "activity_log",
    "deals",
    "growth_snapshots",
    "creator_brand_links",
    "creators",
    "brand_members",
    "brands",
]

NIL_UUID = "00000000-0000-0000-0000-000000000000"


async def main() -> None:
    client = get_supabase_client(service_role=True)

    users = client.auth.admin.list_users()
    preserved = [u for u in users if u.email in PRESERVE_EMAILS]
    preserved_creator_ids = set()
    for u in preserved:
        rows = client.table("creators").select("id").eq("user_id", str(u.id)).execute().data
        preserved_creator_ids.update(r["id"] for r in rows)
    print(f"Preserving {len(preserved)} account(s): {[u.email for u in preserved]}")
    print(f"  (creator ids kept: {preserved_creator_ids or 'none'})")

    for table in TABLES_IN_DELETE_ORDER:
        q = client.table(table).delete().neq("id", NIL_UUID)
        # creator_brand_links is deliberately NOT exempted here even for a
        # preserved creator: every brand row is about to be deleted, and a
        # link left pointing at one would violate its FK and abort the whole
        # brands delete below. The preserved creator can just re-link with a
        # fresh invite code after reseeding.
        if table in ("creators", "deals", "growth_snapshots") and preserved_creator_ids:
            for cid in preserved_creator_ids:
                q = q.neq("creator_id" if table != "creators" else "id", cid)
        res = q.execute()
        print(f"  {table}: deleted {len(res.data)}")

    deleted_users = 0
    for u in users:
        if u.email in PRESERVE_EMAILS:
            continue
        client.auth.admin.delete_user(str(u.id))
        deleted_users += 1
    print(f"\nDeleted {deleted_users} auth user(s). Preserved {len(preserved)}.")
    print("Done. Run `python -m scripts.seed_demo` next.")


if __name__ == "__main__":
    asyncio.run(main())
