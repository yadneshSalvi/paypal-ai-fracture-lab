from __future__ import annotations
import asyncio
import inspect
import io
import os
import ssl
from collections.abc import AsyncIterable, AsyncIterator, Callable, Iterable, Iterator, Mapping
from contextlib import ExitStack, suppress
from dataclasses import dataclass, replace
from pathlib import Path
from tempfile import mkstemp
from typing import Any
import certifi
import httpx2
from typing_extensions import TypeIs
from ._internal.content_disposition import render_content_disposition
from .bodies import BinaryBody, FormBody, JsonBody, MultipartBody, MultipartFile, MultipartPart, MultipartText, RequestBody, TextBody
from .exceptions import TransportError
from .files import AsyncBinaryContent, AsyncBinaryReader, BinaryReader
from .transport import AsyncHttpClient, AsyncHttpResponse, HttpClient, HttpRequest, HttpResponse
_DEFAULT_TIMEOUT = 30.0
_CHUNK_SIZE = 65536
_ASYNC_SOURCE_ON_SYNC_CLIENT = 'an async byte source cannot be sent by the sync client -- pass bytes, a Path, a binary reader or an Iterator[bytes], or use the async client'

def _is_async_reader(content: object) -> TypeIs[AsyncBinaryReader]:
    ...

def _require_binary_reader(reader: BinaryReader) -> None:
    ...

def _reports_its_own_length(reader: BinaryReader) -> bool:
    ...

def _is_at_start(reader: BinaryReader) -> bool:
    ...

def _sync_content(content: AsyncBinaryContent, stack: ExitStack) -> bytes | BinaryReader | Iterable[bytes]:
    ...

async def _awaited_chunks(reader: AsyncBinaryReader) -> AsyncIterator[bytes]:
    ...

async def _aiter(chunks: AsyncIterable[bytes]) -> AsyncIterator[bytes]:
    ...

def _async_content(content: AsyncBinaryContent, stack: ExitStack) -> bytes | AsyncIterable[bytes]:
    ...

class _ChunkReader:
    __slots__ = ('_buffer', '_chunks')

    def __init__(self, chunks: Iterable[bytes]) -> None:
        ...

    def read(self, size: int=-1, /) -> bytes:
        ...

class _UnsizedReader:
    __slots__ = ('_reader',)

    def __init__(self, reader: BinaryReader) -> None:
        ...

    def read(self, size: int=-1, /) -> bytes:
        ...

    def seek(self, offset: int, whence: int=0, /) -> int:
        ...

def _open(content: AsyncBinaryContent, stack: ExitStack) -> bytes | BinaryReader:
    ...

async def _spilled(chunks: AsyncIterator[bytes], stack: ExitStack) -> BinaryReader:
    ...

async def _drained(part: MultipartPart, stack: ExitStack) -> MultipartPart:
    ...

async def _drained_parts(body: RequestBody | None, stack: ExitStack) -> RequestBody | None:
    ...

def _httpx2_part(part: MultipartPart, stack: ExitStack) -> tuple[str, Any]:
    ...

def _body_kwargs(body: RequestBody | None, headers: Mapping[str, str], stack: ExitStack, *, binary_content: Callable[[AsyncBinaryContent, ExitStack], object]) -> dict[str, Any]:
    ...

def _timeout_kwargs(request: HttpRequest) -> dict[str, Any]:
    ...

def _default_ssl_context() -> ssl.SSLContext:
    ...

@dataclass(frozen=True, slots=True)
class _Httpx2Response:
    _response: httpx2.Response

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

@dataclass(frozen=True, slots=True)
class _AsyncHttpx2Response:
    _response: httpx2.Response

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

class Httpx2Client(HttpClient):

    def __init__(self, *, timeout: float=_DEFAULT_TIMEOUT, proxy_url: str | None=None, verify: ssl.SSLContext | bool=True) -> None:
        ...

    def send(self, request: HttpRequest) -> HttpResponse:
        ...

    def close(self) -> None:
        ...

class AsyncHttpx2Client(AsyncHttpClient):

    def __init__(self, *, timeout: float=_DEFAULT_TIMEOUT, proxy_url: str | None=None, verify: ssl.SSLContext | bool=True) -> None:
        ...

    async def send(self, request: HttpRequest) -> AsyncHttpResponse:
        ...

    async def aclose(self) -> None:
        ...
