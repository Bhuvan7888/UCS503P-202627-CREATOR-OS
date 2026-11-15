from uuid import UUID

from features.brands.models import Brand, BrandProfileUpdate
from features.brands.repository import BrandRepo
from shared.errors import NotFoundError


class BrandService:
    """The signed-in brand's own profile (brand Settings)."""

    def __init__(self, brand_repo: BrandRepo):
        self.brand_repo = brand_repo

    async def get(self, brand_id: UUID) -> Brand:
        brand = await self.brand_repo.get(brand_id)
        if brand is None:
            raise NotFoundError("Brand not found")
        return brand

    async def update(self, brand_id: UUID, request: BrandProfileUpdate) -> Brand:
        await self.get(brand_id)
        return await self.brand_repo.update(brand_id, request.model_dump())
