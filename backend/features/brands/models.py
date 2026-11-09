from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class Brand(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    name: str
    description: str | None = None
    gst_number: str | None = None
    pan_number: str | None = None
    created_at: datetime

class BrandMember(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    brand_id: UUID
    user_id: UUID
    role: str
    created_at: datetime
