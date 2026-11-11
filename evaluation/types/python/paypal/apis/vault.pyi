from __future__ import annotations
from uuid import UUID, uuid4
from ..auth import AsyncAuthSchemes, AuthSchemes
from ..core import ApiResult, AsyncRawClient, RawClient, RequestOptionsOrDict, SecuredRawResponse, async_empty_response, async_json_decoder, empty_response, json_body, json_decoder, param, unwrap
from ..errors.create_payment_token_error import CreatePaymentTokenErrorBody, create_payment_token_error_mapper
from ..errors.create_setup_token_error import CreateSetupTokenErrorBody, create_setup_token_error_mapper
from ..errors.delete_payment_token_error import DeletePaymentTokenErrorBody, delete_payment_token_error_mapper
from ..errors.get_payment_token_error import GetPaymentTokenErrorBody, get_payment_token_error_mapper
from ..errors.get_setup_token_error import GetSetupTokenErrorBody, get_setup_token_error_mapper
from ..errors.list_customer_payment_tokens_error import ListCustomerPaymentTokensErrorBody, list_customer_payment_tokens_error_mapper
from ..models.customer_vault_payment_tokens_response import CustomerVaultPaymentTokensResponse
from ..models.payment_token_request import PaymentTokenRequest, PaymentTokenRequestDict
from ..models.payment_token_response import PaymentTokenResponse
from ..models.setup_token_request import SetupTokenRequest, SetupTokenRequestDict
from ..models.setup_token_response import SetupTokenResponse
from ..server.server import Server

class Vault:

    def __init__(self, client: RawClient, server: Server, auth: AuthSchemes) -> None:
        ...

    def create_payment_token(self, body: PaymentTokenRequest | PaymentTokenRequestDict, *, pay_pal_request_id: str | None=None, request_options: RequestOptionsOrDict | None=None) -> PaymentTokenResponse:
        ...

    def create_setup_token(self, body: SetupTokenRequest | SetupTokenRequestDict, *, pay_pal_request_id: str | None=None, request_options: RequestOptionsOrDict | None=None) -> SetupTokenResponse:
        ...

    def delete_payment_token(self, id_: str, *, request_options: RequestOptionsOrDict | None=None) -> None:
        ...

    def get_payment_token(self, id_: str, *, request_options: RequestOptionsOrDict | None=None) -> PaymentTokenResponse:
        ...

    def get_setup_token(self, id_: str, *, request_options: RequestOptionsOrDict | None=None) -> SetupTokenResponse:
        ...

    def list_customer_payment_tokens(self, customer_id: str, *, page_size: int | None=5, page: int | None=1, total_required: bool | None=False, request_options: RequestOptionsOrDict | None=None) -> CustomerVaultPaymentTokensResponse:
        ...

    @property
    def with_raw_response(self) -> VaultWithRawResponse:
        ...

class AsyncVault:

    def __init__(self, client: AsyncRawClient, server: Server, auth: AsyncAuthSchemes) -> None:
        ...

    async def create_payment_token(self, body: PaymentTokenRequest | PaymentTokenRequestDict, *, pay_pal_request_id: str | None=None, request_options: RequestOptionsOrDict | None=None) -> PaymentTokenResponse:
        ...

    async def create_setup_token(self, body: SetupTokenRequest | SetupTokenRequestDict, *, pay_pal_request_id: str | None=None, request_options: RequestOptionsOrDict | None=None) -> SetupTokenResponse:
        ...

    async def delete_payment_token(self, id_: str, *, request_options: RequestOptionsOrDict | None=None) -> None:
        ...

    async def get_payment_token(self, id_: str, *, request_options: RequestOptionsOrDict | None=None) -> PaymentTokenResponse:
        ...

    async def get_setup_token(self, id_: str, *, request_options: RequestOptionsOrDict | None=None) -> SetupTokenResponse:
        ...

    async def list_customer_payment_tokens(self, customer_id: str, *, page_size: int | None=5, page: int | None=1, total_required: bool | None=False, request_options: RequestOptionsOrDict | None=None) -> CustomerVaultPaymentTokensResponse:
        ...

    @property
    def with_raw_response(self) -> AsyncVaultWithRawResponse:
        ...

class VaultWithRawResponse(SecuredRawResponse[RawClient, Server, AuthSchemes]):

    def create_payment_token(self, body: PaymentTokenRequest | PaymentTokenRequestDict, *, pay_pal_request_id: str | None=None, request_options: RequestOptionsOrDict | None=None) -> ApiResult[PaymentTokenResponse, CreatePaymentTokenErrorBody]:
        ...

    def create_setup_token(self, body: SetupTokenRequest | SetupTokenRequestDict, *, pay_pal_request_id: str | None=None, request_options: RequestOptionsOrDict | None=None) -> ApiResult[SetupTokenResponse, CreateSetupTokenErrorBody]:
        ...

    def delete_payment_token(self, id_: str, *, request_options: RequestOptionsOrDict | None=None) -> ApiResult[None, DeletePaymentTokenErrorBody]:
        ...

    def get_payment_token(self, id_: str, *, request_options: RequestOptionsOrDict | None=None) -> ApiResult[PaymentTokenResponse, GetPaymentTokenErrorBody]:
        ...

    def get_setup_token(self, id_: str, *, request_options: RequestOptionsOrDict | None=None) -> ApiResult[SetupTokenResponse, GetSetupTokenErrorBody]:
        ...

    def list_customer_payment_tokens(self, customer_id: str, *, page_size: int | None=5, page: int | None=1, total_required: bool | None=False, request_options: RequestOptionsOrDict | None=None) -> ApiResult[CustomerVaultPaymentTokensResponse, ListCustomerPaymentTokensErrorBody]:
        ...

class AsyncVaultWithRawResponse(SecuredRawResponse[AsyncRawClient, Server, AsyncAuthSchemes]):

    async def create_payment_token(self, body: PaymentTokenRequest | PaymentTokenRequestDict, *, pay_pal_request_id: str | None=None, request_options: RequestOptionsOrDict | None=None) -> ApiResult[PaymentTokenResponse, CreatePaymentTokenErrorBody]:
        ...

    async def create_setup_token(self, body: SetupTokenRequest | SetupTokenRequestDict, *, pay_pal_request_id: str | None=None, request_options: RequestOptionsOrDict | None=None) -> ApiResult[SetupTokenResponse, CreateSetupTokenErrorBody]:
        ...

    async def delete_payment_token(self, id_: str, *, request_options: RequestOptionsOrDict | None=None) -> ApiResult[None, DeletePaymentTokenErrorBody]:
        ...

    async def get_payment_token(self, id_: str, *, request_options: RequestOptionsOrDict | None=None) -> ApiResult[PaymentTokenResponse, GetPaymentTokenErrorBody]:
        ...

    async def get_setup_token(self, id_: str, *, request_options: RequestOptionsOrDict | None=None) -> ApiResult[SetupTokenResponse, GetSetupTokenErrorBody]:
        ...

    async def list_customer_payment_tokens(self, customer_id: str, *, page_size: int | None=5, page: int | None=1, total_required: bool | None=False, request_options: RequestOptionsOrDict | None=None) -> ApiResult[CustomerVaultPaymentTokensResponse, ListCustomerPaymentTokensErrorBody]:
        ...
