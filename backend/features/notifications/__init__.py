"""Notifications: the per-person inbox fed by workspace events (assignments, publishing, deadlines, team).

Public API of this feature. Other packages import from here, never from submodules.
"""

from features.notifications.models import Notification
from features.notifications.service import NotificationService

__all__ = ["Notification", "NotificationService"]
