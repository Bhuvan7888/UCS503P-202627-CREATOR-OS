import pytest
from fastapi import HTTPException

from shared.errors import InvalidStatusTransition
from shared.http_errors import map_errors


def test_maps_listed_exception_to_status_with_message():
    with pytest.raises(HTTPException) as info, map_errors({ValueError: 404}):
        raise ValueError("Session not found")
    assert info.value.status_code == 404
    assert info.value.detail == "Session not found"


def test_first_matching_type_wins_like_ordered_except_clauses():
    with pytest.raises(HTTPException) as info, map_errors({InvalidStatusTransition: 400, Exception: 500}):
        raise InvalidStatusTransition("Payment", "paid", "refunded")
    assert info.value.status_code == 400


def test_by_message_overrides_status():
    mapping = {ValueError: 400}
    with pytest.raises(HTTPException) as info, map_errors(mapping, by_message={"Payment not found": 404}):
        raise ValueError("Payment not found")
    assert info.value.status_code == 404
    with pytest.raises(HTTPException) as info, map_errors(mapping, by_message={"Payment not found": 404}):
        raise ValueError("Amount must be positive")
    assert info.value.status_code == 400


def test_unlisted_exceptions_propagate_unchanged():
    with pytest.raises(KeyError), map_errors({ValueError: 400}):
        raise KeyError("x")
