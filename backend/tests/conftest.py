import pytest

from main import app


@pytest.fixture(autouse=True)
def _reset_dependency_overrides():
    """Isolate tests: a test that fails before clearing its FastAPI overrides must not leak them."""
    yield
    app.dependency_overrides.clear()
