"""Messages: brand <-> creator chat and unread indicator.

Public API of this feature. Other packages import from here, never from submodules.
"""

from features.messages.models import Message

__all__ = [
    "Message",
]
