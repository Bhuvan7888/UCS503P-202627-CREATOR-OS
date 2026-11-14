import hashlib
import hmac
from datetime import timedelta

from features.integrations.rules import (
    HUMAN_ONLY,
    RETRY_BACKOFF,
    hash_secret,
    is_public_https_url,
    new_api_key,
    next_retry,
    permissions_for_scopes,
    sign,
)


def test_owner_scope_is_everything_except_what_only_people_may_do():
    owner = set(permissions_for_scopes(["owner"]))
    assert {"create_content", "request_publish", "manage_webhooks", "view_analytics"} <= owner
    assert not owner & HUMAN_ONLY
    assert permissions_for_scopes(["content:read"]) == [
        "view_dashboard",
        "view_kanban",
        "view_schedule",
        "view_scripts",
    ]


def test_keys_and_signatures():
    prefix, secret = new_api_key()
    assert secret.startswith(f"cos_{prefix}_") and hash_secret(secret) != secret
    body = b'{"event":"x"}'
    expected = hmac.new(b"whsec", b"1700000000." + body, hashlib.sha256).hexdigest()
    assert sign("whsec", "1700000000", body) == f"sha256={expected}"


def test_retries_last_about_fifteen_hours_then_stop():
    assert timedelta(hours=15) <= sum(RETRY_BACKOFF, timedelta()) <= timedelta(hours=16)
    assert next_retry(1) == timedelta(minutes=1) and next_retry(len(RETRY_BACKOFF) + 1) is None


def test_only_public_https_urls():
    assert not is_public_https_url("http://example.com/hook")
    assert not is_public_https_url("https://localhost/hook")
    assert not is_public_https_url("https://127.0.0.1/hook")
    assert not is_public_https_url("https://10.0.0.5/hook")
    assert not is_public_https_url("https://169.254.169.254/latest/meta-data")
