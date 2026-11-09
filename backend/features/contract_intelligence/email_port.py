from typing import Protocol, runtime_checkable


@runtime_checkable
class EmailPort(Protocol):
    async def send(self, to: str, subject: str, body: str) -> None: ...
