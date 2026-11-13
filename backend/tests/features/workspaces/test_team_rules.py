from features.workspaces.rules import (
    DEFAULT_ROLE_PERMISSIONS,
    PERMISSIONS,
    effective_permissions,
    hash_invite_token,
    new_invite_token,
    seats_left,
)


def test_default_permission_counts_match_the_spec():
    assert len(PERMISSIONS) == 11
    counts = {role: len(p) for role, p in DEFAULT_ROLE_PERMISSIONS.items()}
    assert counts == {"script_writer": 5, "video_editor": 6, "brand_manager": 8}


def test_owner_always_has_everything_and_overrides_replace_defaults():
    assert effective_permissions("owner", {"owner": []}) == list(PERMISSIONS)
    assert "view_brand_deals" in effective_permissions("brand_manager", {})
    assert effective_permissions("brand_manager", {"brand_manager": ["view_kanban", "bogus"]}) == [
        "view_kanban"
    ]


def test_seats_and_tokens():
    assert seats_left("script_writer", 1, 1) == 0 and seats_left("script_writer", 0, 0) == 2
    t1, t2 = new_invite_token(), new_invite_token()
    assert t1 != t2 and len(t1) >= 40
    assert hash_invite_token(t1) == hash_invite_token(t1) != t1
