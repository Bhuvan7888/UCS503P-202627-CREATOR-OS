"""Account rules: notification defaults and when an email may be sent."""

from datetime import datetime, time
from zoneinfo import ZoneInfo

from features.account.models import Category, CategoryPreference, NotificationPreferences

CATEGORIES: tuple[Category, ...] = (
    "task_assignments",
    "publishing_updates",
    "deadlines",
    "workspace_activity",
)
DEFAULTS: dict[Category, CategoryPreference] = {
    "task_assignments": CategoryPreference(in_app=True, email=True),
    "publishing_updates": CategoryPreference(in_app=True, email=True),
    "deadlines": CategoryPreference(in_app=True, email=False),
    "workspace_activity": CategoryPreference(in_app=True, email=False),
}


def category_preference(prefs: NotificationPreferences, category: Category) -> CategoryPreference:
    return prefs.categories.get(category, DEFAULTS[category])


def in_quiet_hours(start: time, end: time, now: time) -> bool:
    """The window may cross midnight (22:00 to 07:00)."""
    return start <= now < end if start <= end else now >= start or now < end


def may_email(
    prefs: NotificationPreferences, category: Category, now_utc: datetime, timezone: str
) -> bool:
    if prefs.do_not_disturb or not category_preference(prefs, category).email:
        return False
    local = now_utc.astimezone(ZoneInfo(timezone)).time()
    return not (
        prefs.quiet_hours_enabled and in_quiet_hours(prefs.quiet_start, prefs.quiet_end, local)
    )
