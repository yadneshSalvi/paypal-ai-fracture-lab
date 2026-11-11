from __future__ import annotations
from base64 import b64encode
from collections.abc import Callable, Sequence
from dataclasses import dataclass
from typing import Any, Final, TypeAlias
from urllib.parse import quote
from pydantic import BaseModel, ConfigDict, Field
from typing_extensions import TypeVar
from .._internal.wire import parse_json, text_values
from ..decoding import ErrorMapper
from ..params import Param, param
from ..results import RawError

@dataclass(frozen=True, slots=True)
class AuthParams:
    headers: tuple[Param[Any], ...] = ()
    query_params: tuple[Param[Any], ...] = ()
    cookies: tuple[Param[Any], ...] = ()

    def request_headers(self) -> tuple[Param[Any], ...]:
        ...
ScopeT = TypeVar('ScopeT', bound=str, default=str)

class OAuth2Credentials(BaseModel):

    def __repr_name__(self) -> str:
        ...

class OAuthToken(BaseModel):
    model_config = ConfigDict(frozen=True)
    access_token: str = Field(repr=False)
    token_type: str
    expires_in: int | None = None
    scope: str | None = None

class OAuthTokenRefreshable(OAuthToken):
    refresh_token: str | None = Field(default=None, repr=False)

class OAuthProviderError(BaseModel):
    model_config = ConfigDict(frozen=True)
    error: str
    error_description: str | None = None
    error_uri: str | None = None
OAuthError: TypeAlias = OAuthProviderError | RawError

@dataclass(frozen=True, slots=True)
class OAuthErrorResponse:

    def map(self, status_code: int, content: bytes) -> OAuthError:
        ...
oauth_error_response: Final[ErrorMapper[OAuthError]] = OAuthErrorResponse()
OAuthParams: TypeAlias = tuple[Param[Any], ...]
CredentialsPlacement: TypeAlias = Callable[[str, str | None], tuple[OAuthParams, OAuthParams]]

def scope_params(scopes: Sequence[str] | None) -> OAuthParams:
    ...

def client_secret_basic(client_id: str, client_secret: str | None) -> tuple[OAuthParams, OAuthParams]:
    ...

def client_secret_post(client_id: str, client_secret: str | None) -> tuple[OAuthParams, OAuthParams]:
    ...
