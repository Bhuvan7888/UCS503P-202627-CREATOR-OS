from features.benchmarks import compute_percentiles


def test_compute_percentiles_insufficient_data():
    rates = [100.0, 200.0, 300.0, 400.0]
    result = compute_percentiles(rates)
    assert result.insufficient_data is True
    assert result.p25_rate is None


def test_compute_percentiles_sufficient_data():
    rates = [100.0, 200.0, 300.0, 400.0, 500.0]
    result = compute_percentiles(rates)
    assert result.insufficient_data is False
    assert result.p50_rate == 300.0
    assert result.sample_size == 5
    assert result.p25_rate is not None
    assert result.p75_rate is not None
