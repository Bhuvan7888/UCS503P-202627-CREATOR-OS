from features.benchmarks.models import BenchmarkOut, BenchmarkQuery
from features.benchmarks.repository import RateBenchmarkRepo
from features.benchmarks.rules import compute_percentiles


class BenchmarkService:
    def __init__(self, benchmark_repo: RateBenchmarkRepo):
        self.benchmark_repo = benchmark_repo

    async def get_benchmarks(self, query: BenchmarkQuery) -> BenchmarkOut:
        rates = await self.benchmark_repo.get_historical_rates(query.niche, query.follower_tier)
        return compute_percentiles(rates)
