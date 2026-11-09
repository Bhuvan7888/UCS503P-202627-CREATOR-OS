import threading

import pytest
from pydantic import BaseModel

from shared.supabase_query import first_or_none, run_query


class _Row(BaseModel):
    id: int


class _Response:
    def __init__(self, data):
        self.data = data


class _Query:
    def __init__(self):
        self.thread = None

    def execute(self):
        self.thread = threading.current_thread()
        return _Response([{"id": 7}])


@pytest.mark.asyncio
async def test_run_query_executes_off_the_event_loop_thread():
    query = _Query()
    response = await run_query(query)
    assert response.data == [{"id": 7}]
    assert query.thread is not threading.main_thread()


def test_first_or_none():
    assert first_or_none(_Row, _Response([{"id": 7}, {"id": 8}])) == _Row(id=7)
    assert first_or_none(_Row, _Response([])) is None
