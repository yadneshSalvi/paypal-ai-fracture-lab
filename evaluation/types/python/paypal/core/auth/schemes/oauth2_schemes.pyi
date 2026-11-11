from __future__ import annotations
import asyncio
import threading
import time
from dataclasses import dataclass, field
from math import inf
from typing import Final, Generic, TypeVar
from ...params import param
from ..models import AuthParams, OAuthToken, OAuthTokenRefreshable
from ..protocols import AsyncRefreshableTokenSource, AsyncTokenSource, RefreshableTokenSource, TokenSource
CredentialsT = TypeVar('CredentialsT')
_EXPIRY_BUFFER_SECONDS: Final = 30.0

@dataclass(frozen=True, slots=True)
class _CachedToken:
    access_token: str = field(repr=False)
    expires_at: float

    def is_expired(self) -> bool:
        ...

def _expires_at(expires_in: int | None) -> float:
    ...

def _cache(token: OAuthToken) -> _CachedToken:
    ...

@dataclass(frozen=True, slots=True)
class _CachedRefreshableToken:
    access_token: str = field(repr=False)
    expires_at: float
    refresh_token: str | None = field(repr=False)

    def is_expired(self) -> bool:
        ...

def _cache_refreshable(token: OAuthTokenRefreshable, previous: str | None) -> _CachedRefreshableToken:
    ...

class OAuth2Scheme(Generic[CredentialsT]):
    __slots__ = ('_cached', '_credentials', '_lock', '_source')

    def __init__(self, *, credentials: CredentialsT, source: TokenSource[CredentialsT]) -> None:
        ...

    def apply(self) -> AuthParams:
        ...

    def invalidate(self) -> None:
        ...

    def _get_and_cache_token(self) -> str:
        ...

class AsyncOAuth2Scheme(Generic[CredentialsT]):
    __slots__ = ('_cached', '_credentials', '_lock', '_source')

    def __init__(self, *, credentials: CredentialsT, source: AsyncTokenSource[CredentialsT]) -> None:
        ...

    async def apply(self) -> AuthParams:
        ...

    def invalidate(self) -> None:
        ...

    async def _get_and_cache_token(self) -> str:
        ...

class OAuth2RefreshableScheme(Generic[CredentialsT]):
    __slots__ = ('_cached', '_credentials', '_lock', '_source')

    def __init__(self, *, credentials: CredentialsT, source: RefreshableTokenSource[CredentialsT]) -> None:
        ...

    def apply(self) -> AuthParams:
        ...

    def invalidate(self) -> None:
        ...

    def _get_and_cache_token(self) -> str:
        ...

class AsyncOAuth2RefreshableScheme(Generic[CredentialsT]):
    __slots__ = ('_cached', '_credentials', '_lock', '_source')

    def __init__(self, *, credentials: CredentialsT, source: AsyncRefreshableTokenSource[CredentialsT]) -> None:
        ...

    async def apply(self) -> AuthParams:
        ...

    def invalidate(self) -> None:
        ...

    async def _get_and_cache_token(self) -> str:
        ...
