from fastapi import APIRouter, Depends

from application.services.benchmarks import BenchmarkService
from domain.models.benchmarks import BenchmarkOut, BenchmarkQuery
from infrastructure.supabase.repos import SupabaseRateBenchmarkRepo
from shared.supabase_client import get_supabase_client


def get_benchmark_service() -> BenchmarkService:
    return BenchmarkService(SupabaseRateBenchmarkRepo(get_supabase_client(service_role=True)))

router = APIRouter(prefix="/benchmarks", tags=["Benchmarks"])

@router.get("", response_model=BenchmarkOut)
async def get_benchmarks(
    niche: str,
    follower_tier: str,
    service: BenchmarkService = Depends(get_benchmark_service)
):
    query = BenchmarkQuery(niche=niche, follower_tier=follower_tier)
    return await service.get_benchmarks(query)
