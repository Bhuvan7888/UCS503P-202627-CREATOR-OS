"""Page-size limits shared by list endpoints."""

MAX_PAGE_SIZE = 100


def clamp_page_size(limit: int) -> int:
    """Cap a client-requested page size at MAX_PAGE_SIZE."""
    return min(limit, MAX_PAGE_SIZE)
