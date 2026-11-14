"""Account: the signed-in person's profile and notification preferences.

Public API of this feature. Other packages import from here, never from submodules.
"""

from features.account.models import Category, NotificationPreferences
from features.account.rules import CATEGORIES, category_preference, may_email
from features.account.service import AccountService

__all__ = [
    "CATEGORIES",
    "AccountService",
    "Category",
    "NotificationPreferences",
    "category_preference",
    "may_email",
]
