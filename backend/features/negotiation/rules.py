from typing import Literal

from features.negotiation.models import (
    ChecklistState,
    ForecastPoint,
    NegotiationSession,
)
from shared.money import format_inr


def calculate_base_rate(
    views_per_week: float,
    niche_cpm: float,
    follower_tier_multiplier: float,
    engagement_rate_adjustment: float
) -> float:
    # CPM = cost per mille (per 1,000 views) — the standard ad-industry unit,
    # and what the "Niche CPM (₹)" field in the UI is labeled as. Multiplying
    # the raw weekly view count by CPM directly (no /1000) inflated every
    # rate ~1000x — e.g. 18,000 views/week × ₹40 CPM read as ₹7.2L instead of
    # the correct ₹720, making every calculated rate wildly unrealistic.
    return (views_per_week / 1000 * niche_cpm) + follower_tier_multiplier + engagement_rate_adjustment

def calculate_range(base_rate: float) -> tuple[float, float]:
    return base_rate * 0.85, base_rate * 1.35

def calculate_forecast(base_rate: float, weekly_growth_rate: float, weeks: int) -> list[ForecastPoint]:
    forecasts = []
    current_base = base_rate
    for w in range(1, weeks + 1):
        low, high = calculate_range(current_base)
        forecasts.append(ForecastPoint(week=w, low=low, mid=current_base, high=high))
        current_base *= (1 + weekly_growth_rate)
    return forecasts

def checklist_is_complete(state: ChecklistState) -> bool:
    return (
        state.usage_rights_duration_set and
        state.exclusivity_scope_set and
        state.revision_limit_set and
        state.payment_timeline_set
    )

def generate_script(
    kind: Literal['lowball_opener', 'exposure_instead_of_pay', 'scope_creep'], 
    session: NegotiationSession
) -> str:
    if kind == 'lowball_opener':
        return (
            f"Hi team, based on our typical performance, our data-backed base rate is "
            f"{format_inr(session.base_rate)}. We can offer a starting range of {format_inr(session.range_low)}."
        )
    elif kind == 'exposure_instead_of_pay':
        return "While we appreciate the offer for exposure, our business model requires monetary compensation for deliverables."
    elif kind == 'scope_creep':
        return "The requested additions fall outside our agreed scope. We can either stick to the original scope or revise the rate accordingly."
    raise ValueError("Unknown script kind")
