"""Helpers shared by every Supabase repository.

The supabase-py client is synchronous; `run_query` executes a fully built query in a worker
thread so it never blocks the event loop.
"""

import asyncio
from typing import Any

from pydantic import BaseModel


async def run_query(query: Any) -> Any:
    """Execute a built PostgREST/Supabase query (anything with `.execute()`) off the event loop."""
    return await asyncio.to_thread(query.execute)


def first_or_none[ModelT: BaseModel](model: type[ModelT], response: Any) -> ModelT | None:
    """Validate the first returned row into `model`, or return None when no row came back."""
    return model.model_validate(response.data[0]) if response.data else None
