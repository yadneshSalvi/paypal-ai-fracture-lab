from __future__ import annotations
import asyncio
import time
from collections.abc import Awaitable, Callable, Sequence
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Generic, TypeVar
from ._internal.headers import resolve_headers
from ._internal.urls import build_url, resolve_params
from .auth import AsyncAuthScheme, AuthParams, AuthScheme, invalidate, no_auth, resolve_auth
from .bodies import RequestBody
from .decoding import AsyncResponseDecoder, ErrorMapper, ResponseDecoder
from .exceptions import TransportError
from .params import Param, UrlTemplate
from .request_options import RequestOptions, RequestOptionsOrDict, apply_retry_overrides
from .results import ApiResult, Failure, Success
from .retries import RetryOptions, backoff_seconds, is_retryable_body, retry_after_seconds
from .transport import AsyncHttpClient, AsyncHttpResponse, HttpClient, HttpMethod, HttpRequest, HttpResponse
T = TypeVar('T')
E = TypeVar('E')
TransportT = TypeVar('TransportT', bound=HttpClient | AsyncHttpClient)

@dataclass(frozen=True, slots=True)
class BaseRawClient(Generic[TransportT]):
    http_client: TransportT
    retry_options: RetryOptions
    global_headers: Sequence[Param[Any]] = ()
    global_query_params: Sequence[Param[Any]] = ()
    global_path_params: Sequence[Param[Any]] = ()

    def _build_request(self, *, http_method: HttpMethod, url_template: UrlTemplate, path_params: Sequence[Param[Any]] | None, query_params: Sequence[Param[Any]] | None, headers: Sequence[Param[Any]] | None, body: RequestBody | None, auth: AuthParams, options: RequestOptions) -> HttpRequest:
        ...

@dataclass(frozen=True, slots=True)
class RawClient(BaseRawClient[HttpClient]):

    def execute(self, *, http_method: HttpMethod, url_template: UrlTemplate, path_params: Sequence[Param[Any]] | None=None, query_params: Sequence[Param[Any]] | None=None, headers: Sequence[Param[Any]] | None=None, body: RequestBody | None=None, auth_scheme: AuthScheme=no_auth, decoder: ResponseDecoder[T], error_mapper: ErrorMapper[E], request_options: RequestOptionsOrDict | None=None) -> ApiResult[T, E]:
        ...

    @staticmethod
    def _attempt_send(*, auth_scheme: AuthScheme, retry_options: RetryOptions, is_retryable: bool, on_send: Callable[[], HttpResponse]) -> HttpResponse:
        ...

@dataclass(frozen=True, slots=True)
class AsyncRawClient(BaseRawClient[AsyncHttpClient]):

    async def execute(self, *, http_method: HttpMethod, url_template: UrlTemplate, path_params: Sequence[Param[Any]] | None=None, query_params: Sequence[Param[Any]] | None=None, headers: Sequence[Param[Any]] | None=None, body: RequestBody | None=None, auth_scheme: AsyncAuthScheme=no_auth, decoder: AsyncResponseDecoder[T], error_mapper: ErrorMapper[E], request_options: RequestOptionsOrDict | None=None) -> ApiResult[T, E]:
        ...

    @staticmethod
    async def _attempt_send(*, auth_scheme: AsyncAuthScheme, retry_options: RetryOptions, is_retryable: bool, on_send: Callable[[], Awaitable[AsyncHttpResponse]]) -> AsyncHttpResponse:
        ...
RawClientT = TypeVar('RawClientT', bound=RawClient | AsyncRawClient)
