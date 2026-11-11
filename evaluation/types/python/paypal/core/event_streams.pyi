from __future__ import annotations
import warnings
from collections.abc import AsyncIterator, Callable, Iterator
from typing import Generic, TypeVar
from typing_extensions import Self
from ._internal.sse_parser import SseParser
from ._internal.urls import strip_query
from .transport import AsyncHttpResponse, HttpResponse
T = TypeVar('T')

class EventStream(Generic[T]):
    __slots__ = ('_closed', '_decode_data', '_parser', '_response', '_sentinel', '_url')

    def __init__(self, response: HttpResponse, decode_data: Callable[[str], T], sentinel: str | None) -> None:
        ...

    def __iter__(self) -> Iterator[T]:
        ...

    def _consume(self) -> Iterator[T]:
        ...

    def _events(self) -> Iterator[str]:
        ...

    def close(self) -> None:
        ...

    def __enter__(self) -> Self:
        ...

    def __exit__(self, *exc: object) -> None:
        ...

    def __del__(self) -> None:
        ...

    def __repr__(self) -> str:
        ...

    def _ensure_open(self) -> None:
        ...

class AsyncEventStream(Generic[T]):
    __slots__ = ('_closed', '_decode_data', '_parser', '_response', '_sentinel', '_url')

    def __init__(self, response: AsyncHttpResponse, decode_data: Callable[[str], T], sentinel: str | None) -> None:
        ...

    def __aiter__(self) -> AsyncIterator[T]:
        ...

    async def _consume(self) -> AsyncIterator[T]:
        ...

    async def _events(self) -> AsyncIterator[str]:
        ...

    async def aclose(self) -> None:
        ...

    async def __aenter__(self) -> Self:
        ...

    async def __aexit__(self, *exc: object) -> None:
        ...

    def __del__(self) -> None:
        ...

    def __repr__(self) -> str:
        ...

    def _ensure_open(self) -> None:
        ...
