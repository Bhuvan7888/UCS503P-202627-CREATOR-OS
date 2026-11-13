"""Deals: brand deal pipeline, deal status lifecycle, creator deal stats and weekly value.

Public API of this feature. Other packages import from here, never from submodules.
"""

from features.deals.models import Deal, DealCreateRequest
from features.deals.repository import DealRepo
from features.deals.rules import can_access_deal
from features.deals.service import DealService

__all__ = [
    "Deal",
    "DealCreateRequest",
    "DealRepo",
    "DealService",
    "can_access_deal",
]
