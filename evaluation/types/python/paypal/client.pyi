from __future__ import annotations
from functools import cached_property
from types import TracebackType
from typing_extensions import Self
from .apis.orders import Orders
from .apis.payments import Payments
from .apis.subscriptions import Subscriptions
from .apis.transaction_search import TransactionSearch
from .apis.vault import Vault
from .auth import AuthSchemes
from .base_client import DEFAULT_TIMEOUT, BasePaypalClient
from .core import OPERATING_SYSTEM, PYTHON_RUNTIME, ClientCredentials, ClientCredentialsOrDict, ClientCredentialsTokenSource, HttpClient, Httpx2Client, OAuth2Scheme, RawClient, RetryOptionsOrDict, TokenSource, client_secret_basic, no_auth, param

class PaypalClient(BasePaypalClient[RawClient]):

    def __init__(self, *, base_url: str | None=None, timeout: float=DEFAULT_TIMEOUT, retry_options: int | RetryOptionsOrDict | None=None, custom_http_client: HttpClient | None=None, oauth2: ClientCredentialsOrDict | None=None, oauth2_token_source: TokenSource[ClientCredentials] | None=None) -> None:
        ...

    @cached_property
    def orders(self) -> Orders:
        ...

    @cached_property
    def payments(self) -> Payments:
        ...

    @cached_property
    def subscriptions(self) -> Subscriptions:
        ...

    @cached_property
    def transaction_search(self) -> TransactionSearch:
        ...

    @cached_property
    def vault(self) -> Vault:
        ...

    def close(self) -> None:
        ...

    def __enter__(self) -> Self:
        ...

    def __exit__(self, exc_type: type[BaseException] | None, exc: BaseException | None, exc_tb: TracebackType | None) -> None:
        ...
Client = PaypalClient
