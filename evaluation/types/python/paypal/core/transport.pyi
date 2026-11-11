from __future__ import annotations
from collections.abc import AsyncIterator, Iterator, Mapping
from dataclasses import dataclass
from typing import Literal, Protocol, TypeAlias
from ._internal.urls import strip_query
from .bodies import RequestBody
HttpMethod: TypeAlias = Literal['GET', 'HEAD', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'TRACE', 'PATCH']

@dataclass(frozen=True, slots=True)
class HttpRequest:
    method: HttpMethod
    url: str
    headers: Mapping[str, str]
    body: RequestBody | None = None
    timeout: float | None = None

    def __repr__(self) -> str:
        ...

class HttpResponse(Protocol):

    @property
    def url(self) -> str:
        ...

    @property
    def status_code(self) -> int:
        ...

    @property
    def headers(self) -> Mapping[str, str]:
        ...

    def iter_bytes(self, chunk_size: int | None) -> Iterator[bytes]:
        ...

    def read(self) -> bytes:
        ...

    def close(self) -> None:
        ...

class AsyncHttpResponse(Protocol):

    @property
    def url(self) -> str:
        ...

    @property
    def status_code(self) -> int:
        ...

    @property
    def headers(self) -> Mapping[str, str]:
        ...

    def aiter_bytes(self, chunk_size: int | None) -> AsyncIterator[bytes]:
        ...

    async def aread(self) -> bytes:
        ...

    async def aclose(self) -> None:
        ...

class HttpClient(Protocol):

    def send(self, request: HttpRequest) -> HttpResponse:
        ...

    def close(self) -> None:
        ...

class AsyncHttpClient(Protocol):

    async def send(self, request: HttpRequest) -> AsyncHttpResponse:
        ...

    async def aclose(self) -> None:
        ...
