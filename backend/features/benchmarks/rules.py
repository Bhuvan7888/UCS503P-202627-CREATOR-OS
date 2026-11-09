import statistics

from features.benchmarks.models import BenchmarkOut


def compute_percentiles(historical_rates: list[float]) -> BenchmarkOut:
    """
    Returns a BenchmarkOut containing p25, p50, p75 percentiles for a list of historical rates.
    If the sample size is less than 5, returns insufficient_data = True.
    """
    if len(historical_rates) < 5:
        return BenchmarkOut(insufficient_data=True)

    sorted_rates = sorted(historical_rates)

    try:
        p25 = statistics.quantiles(sorted_rates, n=4)[0]
        p50 = statistics.median(sorted_rates)
        p75 = statistics.quantiles(sorted_rates, n=4)[2]
    except statistics.StatisticsError:
        # Fallback if quantiles fails (e.g. extremely skewed weird data where quantiles complains)
        # But for >=5 items, quantiles should work in Python 3.8+
        p25 = sorted_rates[max(0, len(sorted_rates) // 4)]
        p50 = statistics.median(sorted_rates)
        p75 = sorted_rates[min(len(sorted_rates) - 1, len(sorted_rates) * 3 // 4)]

    return BenchmarkOut(
        insufficient_data=False,
        p25_rate=p25,
        p50_rate=p50,
        p75_rate=p75,
        sample_size=len(historical_rates),
    )
