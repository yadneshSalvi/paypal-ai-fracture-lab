from __future__ import annotations
import asyncio
import os
import warnings
from collections.abc import AsyncIterator, Iterator, Mapping
from pathlib import Path
from typing_extensions import Self
from ._internal.content_disposition import content_disposition_filename, safe_filename
from ._internal.urls import strip_query
from .transport import AsyncHttpResponse, HttpResponse
_CHUNK_SIZE = 65536

class FileResponse:
    __slots__ = ('_closed', '_response', '_url', 'content_length', 'filename', 'headers', 'media_type')

    def __init__(self, response: HttpResponse) -> None:
        ...

    def iter_bytes(self, chunk_size: int=_CHUNK_SIZE) -> Iterator[bytes]:
        ...

    def _consume(self, chunk_size: int) -> Iterator[bytes]:
        ...

    def read(self) -> bytes:
        ...

    def save_to(self, destination: str | Path) -> Path:
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

class AsyncFileResponse:
    __slots__ = ('_closed', '_response', '_url', 'content_length', 'filename', 'headers', 'media_type')

    def __init__(self, response: AsyncHttpResponse) -> None:
        ...

    def aiter_bytes(self, chunk_size: int=_CHUNK_SIZE) -> AsyncIterator[bytes]:
        ...

    async def _consume(self, chunk_size: int) -> AsyncIterator[bytes]:
        ...

    async def aread(self) -> bytes:
        ...

    async def save_to(self, destination: str | Path) -> Path:
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
