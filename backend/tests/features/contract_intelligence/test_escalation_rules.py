import pytest

from features.contract_intelligence import open_case, resolve
from shared.errors import InvalidStatusTransition


def test_open_case_valid():
    status = open_case("draft")
    assert status == "pending_review"

def test_open_case_invalid():
    with pytest.raises(InvalidStatusTransition):
        open_case("void")

def test_resolve_cleared():
    status = resolve("cleared", "signed")
    assert status == "signed"

def test_resolve_cleared_no_previous():
    status = resolve("cleared", "")
    assert status == "draft"

def test_resolve_rejected():
    status = resolve("rejected", "signed")
    assert status == "void"

def test_resolve_amended():
    status = resolve("amended", "uploaded")
    assert status == "uploaded"

def test_resolve_invalid():
    with pytest.raises(InvalidStatusTransition):
        # Mypy will complain if we pass an invalid literal, but we can test runtime behavior
        resolve("unknown_decision", "draft")  # type: ignore
