from pydantic import BaseModel


class BenchmarkQuery(BaseModel):
    niche: str
    follower_tier: str

class BenchmarkOut(BaseModel):
    # Depending on sufficient data, it either has percentiles or it has insufficient_data = True
    insufficient_data: bool = False
    p25_rate: float | None = None
    p50_rate: float | None = None
    p75_rate: float | None = None
    sample_size: int | None = None
