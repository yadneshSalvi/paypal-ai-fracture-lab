from __future__ import annotations
from dataclasses import dataclass
from typing import Generic, TypeAlias
from pydantic import ConfigDict, Field
from typing_extensions import NotRequired, TypedDict
from ...bodies import form_body
from ...decoding import async_json_decoder, json_decoder
from ...params import UrlTemplate, param
from ...raw_client import AsyncRawClient, RawClient
from ...results import unwrap
from ..models import CredentialsPlacement, OAuth2Credentials, OAuthParams, OAuthToken, ScopeT, oauth_error_response, scope_params

class PasswordCredentials(OAuth2Credentials, Generic[ScopeT]):
    model_config = ConfigDict(frozen=True, extra='forbid')
    client_id: str
    client_secret: str | None = Field(default=None, repr=False)
    username: str
    password: str = Field(repr=False)
    scopes: list[ScopeT] | None = None

    @classmethod
    def coerce(cls, value: PasswordCredentialsOrDict[ScopeT]) -> PasswordCredentials[ScopeT]:
        ...

class PasswordCredentialsDict(TypedDict, Generic[ScopeT]):
    client_id: str
    client_secret: NotRequired[str | None]
    username: str
    password: str
    scopes: NotRequired[list[ScopeT] | None]
PasswordCredentialsOrDict: TypeAlias = PasswordCredentials[ScopeT] | PasswordCredentialsDict[ScopeT]

def _token_params(credentials: PasswordCredentials[ScopeT]) -> OAuthParams:
    ...

@dataclass(frozen=True, slots=True, kw_only=True)
class PasswordTokenSource(Generic[ScopeT]):
    client: RawClient
    token_url: UrlTemplate
    placement: CredentialsPlacement

    def fetch(self, credentials: PasswordCredentials[ScopeT]) -> OAuthToken:
        ...

@dataclass(frozen=True, slots=True, kw_only=True)
class AsyncPasswordTokenSource(Generic[ScopeT]):
    client: AsyncRawClient
    token_url: UrlTemplate
    placement: CredentialsPlacement

    async def fetch(self, credentials: PasswordCredentials[ScopeT]) -> OAuthToken:
        ...
