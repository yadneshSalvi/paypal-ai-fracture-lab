from __future__ import annotations
from functools import cached_property
from types import TracebackType
from typing_extensions import Self
from .apis.orders import AsyncOrders
from .apis.payments import AsyncPayments
from .apis.subscriptions import AsyncSubscriptions
from .apis.transaction_search import AsyncTransactionSearch
from .apis.vault import AsyncVault
from .auth import AsyncAuthSchemes
from .base_client import DEFAULT_TIMEOUT, BasePaypalClient
from .core import OPERATING_SYSTEM, PYTHON_RUNTIME, AsyncClientCredentialsTokenSource, AsyncHttpClient, AsyncHttpx2Client, AsyncOAuth2Scheme, AsyncRawClient, AsyncTokenSource, ClientCredentials, ClientCredentialsOrDict, RetryOptionsOrDict, client_secret_basic, no_auth, param

class AsyncPaypalClient(BasePaypalClient[AsyncRawClient]):

    def __init__(self, *, base_url: str | None=None, timeout: float=DEFAULT_TIMEOUT, retry_options: int | RetryOptionsOrDict | None=None, custom_async_http_client: AsyncHttpClient | None=None, oauth2: ClientCredentialsOrDict | None=None, oauth2_token_source: AsyncTokenSource[ClientCredentials] | None=None) -> None:
        ...

    @cached_property
    def orders(self) -> AsyncOrders:
        ...

    @cached_property
    def payments(self) -> AsyncPayments:
        ...

    @cached_property
    def subscriptions(self) -> AsyncSubscriptions:
        ...

    @cached_property
    def transaction_search(self) -> AsyncTransactionSearch:
        ...

    @cached_property
    def vault(self) -> AsyncVault:
        ...

    async def aclose(self) -> None:
        ...

    async def __aenter__(self) -> Self:
        ...

    async def __aexit__(self, exc_type: type[BaseException] | None, exc: BaseException | None, exc_tb: TracebackType | None) -> None:
        ...
AsyncClient = AsyncPaypalClient
