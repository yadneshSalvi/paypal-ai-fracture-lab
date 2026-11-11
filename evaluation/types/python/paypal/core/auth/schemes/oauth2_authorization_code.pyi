from __future__ import annotations
import secrets
from base64 import urlsafe_b64encode
from collections.abc import Awaitable, Callable
from dataclasses import dataclass
from hashlib import sha256
from typing import Generic, Literal, TypeAlias
from pydantic import ConfigDict, Field, model_validator
from typing_extensions import NotRequired, Self, TypedDict
from ..._internal.urls import build_url
from ...bodies import form_body
from ...decoding import async_json_decoder, json_decoder
from ...params import UrlTemplate, param
from ...raw_client import AsyncRawClient, RawClient
from ...results import Success, unwrap
from ..models import CredentialsPlacement, OAuth2Credentials, OAuthParams, OAuthTokenRefreshable, ScopeT, oauth_error_response, scope_params
AuthorizationCodePrompt: TypeAlias = Callable[[str], str]
AsyncAuthorizationCodePrompt: TypeAlias = Callable[[str], Awaitable[str]]
PkceMethod: TypeAlias = Literal['S256', 'plain']

@dataclass(frozen=True, slots=True)
class _Pkce:
    verifier: str
    challenge: str
    method: PkceMethod

def _generate_pkce(method: PkceMethod) -> _Pkce:
    ...

class AuthorizationCodeCredentials(OAuth2Credentials, Generic[ScopeT]):
    model_config = ConfigDict(frozen=True, extra='forbid')
    client_id: str
    client_secret: str | None = Field(default=None, repr=False)
    redirect_uri: str
    scopes: list[ScopeT] | None = None
    state: str | None = None
    pkce: PkceMethod | None = 'S256'
    prompt_for_authorization_code: AuthorizationCodePrompt

    @model_validator(mode='after')
    def _require_a_secret_without_pkce(self) -> Self:
        ...

    @classmethod
    def coerce(cls, value: AuthorizationCodeCredentialsOrDict[ScopeT]) -> AuthorizationCodeCredentials[ScopeT]:
        ...

class AuthorizationCodeCredentialsDict(TypedDict, Generic[ScopeT]):
    client_id: str
    client_secret: NotRequired[str | None]
    redirect_uri: str
    scopes: NotRequired[list[ScopeT] | None]
    state: NotRequired[str | None]
    pkce: NotRequired[PkceMethod | None]
    prompt_for_authorization_code: AuthorizationCodePrompt
AuthorizationCodeCredentialsOrDict: TypeAlias = AuthorizationCodeCredentials[ScopeT] | AuthorizationCodeCredentialsDict[ScopeT]

class AsyncAuthorizationCodeCredentials(OAuth2Credentials, Generic[ScopeT]):
    model_config = ConfigDict(frozen=True, extra='forbid')
    client_id: str
    client_secret: str | None = Field(default=None, repr=False)
    redirect_uri: str
    scopes: list[ScopeT] | None = None
    state: str | None = None
    pkce: PkceMethod | None = 'S256'
    prompt_for_authorization_code: AsyncAuthorizationCodePrompt

    @model_validator(mode='after')
    def _require_a_secret_without_pkce(self) -> Self:
        ...

    @classmethod
    def coerce(cls, value: AsyncAuthorizationCodeCredentialsOrDict[ScopeT]) -> AsyncAuthorizationCodeCredentials[ScopeT]:
        ...

class AsyncAuthorizationCodeCredentialsDict(TypedDict, Generic[ScopeT]):
    client_id: str
    client_secret: NotRequired[str | None]
    redirect_uri: str
    scopes: NotRequired[list[ScopeT] | None]
    state: NotRequired[str | None]
    pkce: NotRequired[PkceMethod | None]
    prompt_for_authorization_code: AsyncAuthorizationCodePrompt
AsyncAuthorizationCodeCredentialsOrDict: TypeAlias = AsyncAuthorizationCodeCredentials[ScopeT] | AsyncAuthorizationCodeCredentialsDict[ScopeT]

def _authorization_params(credentials: AuthorizationCodeCredentials[ScopeT] | AsyncAuthorizationCodeCredentials[ScopeT], pkce: _Pkce | None) -> OAuthParams:
    ...

def _code_verifier_params(pkce: _Pkce | None) -> OAuthParams:
    ...

@dataclass(frozen=True, slots=True, kw_only=True)
class AuthorizationCodeTokenSource(Generic[ScopeT]):
    client: RawClient
    authorization_url: UrlTemplate
    token_url: UrlTemplate
    refresh_url: UrlTemplate
    placement: CredentialsPlacement

    def fetch(self, credentials: AuthorizationCodeCredentials[ScopeT]) -> OAuthTokenRefreshable:
        ...

    def refresh(self, credentials: AuthorizationCodeCredentials[ScopeT], refresh_token: str) -> OAuthTokenRefreshable | None:
        ...

@dataclass(frozen=True, slots=True, kw_only=True)
class AsyncAuthorizationCodeTokenSource(Generic[ScopeT]):
    client: AsyncRawClient
    authorization_url: UrlTemplate
    token_url: UrlTemplate
    refresh_url: UrlTemplate
    placement: CredentialsPlacement

    async def fetch(self, credentials: AsyncAuthorizationCodeCredentials[ScopeT]) -> OAuthTokenRefreshable:
        ...

    async def refresh(self, credentials: AsyncAuthorizationCodeCredentials[ScopeT], refresh_token: str) -> OAuthTokenRefreshable | None:
        ...
