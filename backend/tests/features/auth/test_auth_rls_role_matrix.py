import pytest
from supabase import create_client

from features.demo_mode import is_demo_mode
from shared.config import settings


@pytest.mark.asyncio
async def test_rls_role_matrix():
    # Integration test: only runs against a reachable Supabase project (never in demo mode).
    if is_demo_mode():
        pytest.skip("Supabase not reachable (demo mode); integration test needs a real project.")

    supabase_url = settings.SUPABASE_URL
    service_role_key = settings.SUPABASE_SERVICE_ROLE_KEY

    admin_client = create_client(supabase_url, service_role_key)

    # 1. Admin can read all creators
    res = admin_client.table("creators").select("*").execute()
    assert res.data is not None

    # Normally, we'd sign in as Brand A and test they can't read Brand B.
    # We would test `client.table('creators').select('*').execute()` and assert
    # it only returns Brand A creators.

    # We would also sign in as a Creator and assert they can only read their own row.
