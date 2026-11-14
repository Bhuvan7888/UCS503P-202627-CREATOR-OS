from datetime import UTC, datetime, time

from features.account.models import CategoryPreference, NotificationPreferences
from features.account.rules import category_preference, in_quiet_hours, may_email

NOON_UTC = datetime(2026, 11, 14, 12, 0, tzinfo=UTC)  # 17:30 in Asia/Kolkata


def test_quiet_hours_may_cross_midnight():
    assert in_quiet_hours(time(22), time(7), time(23, 30)) and in_quiet_hours(
        time(22), time(7), time(6, 59)
    )
    assert not in_quiet_hours(time(22), time(7), time(12))
    assert in_quiet_hours(time(9), time(17), time(12)) and not in_quiet_hours(
        time(9), time(17), time(17)
    )


def test_email_respects_category_dnd_and_quiet_hours_in_the_users_timezone():
    prefs = NotificationPreferences()
    assert may_email(prefs, "task_assignments", NOON_UTC, "Asia/Kolkata")
    assert not may_email(prefs, "deadlines", NOON_UTC, "Asia/Kolkata")  # email off by default
    assert not may_email(
        prefs.model_copy(update={"do_not_disturb": True}),
        "task_assignments",
        NOON_UTC,
        "Asia/Kolkata",
    )
    quiet = prefs.model_copy(
        update={"quiet_hours_enabled": True, "quiet_start": time(17), "quiet_end": time(18)}
    )
    assert not may_email(quiet, "task_assignments", NOON_UTC, "Asia/Kolkata")
    assert may_email(quiet, "task_assignments", NOON_UTC, "UTC")


def test_saved_categories_override_defaults():
    prefs = NotificationPreferences(
        categories={"deadlines": CategoryPreference(in_app=False, email=True)}
    )
    assert (
        category_preference(prefs, "deadlines").email
        and not category_preference(prefs, "deadlines").in_app
    )
    assert category_preference(prefs, "workspace_activity").in_app
