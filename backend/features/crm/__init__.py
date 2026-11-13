"""Brand CRM: a creator's own brand deals (pipeline, KPIs) plus their brand deals made on Creator OS.

Public API of this feature. Other packages import from here, never from submodules.
"""

from features.crm.models import CrmDeal
from features.crm.repository import CrmDealRepo
from features.crm.service import CrmService

__all__ = ["CrmDeal", "CrmDealRepo", "CrmService"]
