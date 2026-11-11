from __future__ import annotations
from collections.abc import Awaitable
from typing import Protocol, TypeVar, runtime_checkable
from .models import AuthParams, OAuthToken, OAuthTokenRefreshable
CredentialsT_contra = TypeVar('CredentialsT_contra', contravariant=True)

class AuthScheme(Protocol):

    def apply(self) -> AuthParams:
        ...

class AsyncAuthScheme(Protocol):

    def apply(self) -> AuthParams | Awaitable[AuthParams]:
        ...

@runtime_checkable
class RevocableAuthScheme(Protocol):

    def invalidate(self) -> None:
        ...

class TokenSource(Protocol[CredentialsT_contra]):

    def fetch(self, credentials: CredentialsT_contra) -> OAuthToken:
        ...

class AsyncTokenSource(Protocol[CredentialsT_contra]):

    async def fetch(self, credentials: CredentialsT_contra) -> OAuthToken:
        ...

class RefreshableTokenSource(TokenSource[CredentialsT_contra], Protocol[CredentialsT_contra]):

    def fetch(self, credentials: CredentialsT_contra) -> OAuthTokenRefreshable:
        ...

    def refresh(self, credentials: CredentialsT_contra, refresh_token: str) -> OAuthTokenRefreshable | None:
        ...

class AsyncRefreshableTokenSource(AsyncTokenSource[CredentialsT_contra], Protocol[CredentialsT_contra]):

    async def fetch(self, credentials: CredentialsT_contra) -> OAuthTokenRefreshable:
        ...

    async def refresh(self, credentials: CredentialsT_contra, refresh_token: str) -> OAuthTokenRefreshable | None:
        ...
