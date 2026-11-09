"""Translate domain exceptions into HTTP errors in routers.

Each route states exactly which exceptions it maps and to which status code, so behaviour stays
route-specific (a ValueError is a 404 in one route and a 400 in another). Exceptions that are not
listed propagate unchanged.

    with map_errors({InvalidStatusTransition: 400, ValueError: 404}):
        return await service.update_status(...)

    with map_errors({ValueError: 400}, by_message={"Payment not found": 404}):
        ...
"""

from collections.abc import Iterator, Mapping
from contextlib import contextmanager

from fastapi import HTTPException


@contextmanager
def map_errors(
    status_by_type: Mapping[type[Exception], int],
    *,
    by_message: Mapping[str, int] | None = None,
) -> Iterator[None]:
    """Re-raise listed exceptions as HTTPException(detail=str(exc)).

    The first matching type in `status_by_type` wins (same as ordered `except` clauses);
    `by_message` overrides the status when the exception message matches exactly.
    """
    try:
        yield
    except tuple(status_by_type) as exc:
        message = str(exc)
        status = (by_message or {}).get(message)
        if status is None:
            status = next(
                code for exc_type, code in status_by_type.items() if isinstance(exc, exc_type)
            )
        raise HTTPException(status_code=status, detail=message) from exc
