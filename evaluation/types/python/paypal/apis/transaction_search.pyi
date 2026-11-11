from __future__ import annotations
from ..auth import AsyncAuthSchemes, AuthSchemes
from ..core import ApiResult, AsyncRawClient, RawClient, RawError, RequestOptionsOrDict, SecuredRawResponse, async_json_decoder, json_decoder, param, raw_error_response, unwrap
from ..errors.search_balances_error import SearchBalancesErrorBody, search_balances_error_mapper
from ..models.balances_response import BalancesResponse
from ..models.search_response import SearchResponse
from ..server.server import Server

class TransactionSearch:

    def __init__(self, client: RawClient, server: Server, auth: AuthSchemes) -> None:
        ...

    def search_balances(self, *, as_of_time: str | None=None, currency_code: str | None=None, request_options: RequestOptionsOrDict | None=None) -> BalancesResponse:
        ...

    def search_transactions(self, start_date: str, end_date: str, *, transaction_id: str | None=None, transaction_type: str | None=None, transaction_status: str | None=None, transaction_amount: str | None=None, transaction_currency: str | None=None, payment_instrument_type: str | None=None, store_id: str | None=None, terminal_id: str | None=None, fields: str | None='transaction_info', balance_affecting_records_only: str | None='Y', page_size: int | None=100, page: int | None=1, request_options: RequestOptionsOrDict | None=None) -> SearchResponse:
        ...

    @property
    def with_raw_response(self) -> TransactionSearchWithRawResponse:
        ...

class AsyncTransactionSearch:

    def __init__(self, client: AsyncRawClient, server: Server, auth: AsyncAuthSchemes) -> None:
        ...

    async def search_balances(self, *, as_of_time: str | None=None, currency_code: str | None=None, request_options: RequestOptionsOrDict | None=None) -> BalancesResponse:
        ...

    async def search_transactions(self, start_date: str, end_date: str, *, transaction_id: str | None=None, transaction_type: str | None=None, transaction_status: str | None=None, transaction_amount: str | None=None, transaction_currency: str | None=None, payment_instrument_type: str | None=None, store_id: str | None=None, terminal_id: str | None=None, fields: str | None='transaction_info', balance_affecting_records_only: str | None='Y', page_size: int | None=100, page: int | None=1, request_options: RequestOptionsOrDict | None=None) -> SearchResponse:
        ...

    @property
    def with_raw_response(self) -> AsyncTransactionSearchWithRawResponse:
        ...

class TransactionSearchWithRawResponse(SecuredRawResponse[RawClient, Server, AuthSchemes]):

    def search_balances(self, *, as_of_time: str | None=None, currency_code: str | None=None, request_options: RequestOptionsOrDict | None=None) -> ApiResult[BalancesResponse, SearchBalancesErrorBody]:
        ...

    def search_transactions(self, start_date: str, end_date: str, *, transaction_id: str | None=None, transaction_type: str | None=None, transaction_status: str | None=None, transaction_amount: str | None=None, transaction_currency: str | None=None, payment_instrument_type: str | None=None, store_id: str | None=None, terminal_id: str | None=None, fields: str | None='transaction_info', balance_affecting_records_only: str | None='Y', page_size: int | None=100, page: int | None=1, request_options: RequestOptionsOrDict | None=None) -> ApiResult[SearchResponse, RawError]:
        ...

class AsyncTransactionSearchWithRawResponse(SecuredRawResponse[AsyncRawClient, Server, AsyncAuthSchemes]):

    async def search_balances(self, *, as_of_time: str | None=None, currency_code: str | None=None, request_options: RequestOptionsOrDict | None=None) -> ApiResult[BalancesResponse, SearchBalancesErrorBody]:
        ...

    async def search_transactions(self, start_date: str, end_date: str, *, transaction_id: str | None=None, transaction_type: str | None=None, transaction_status: str | None=None, transaction_amount: str | None=None, transaction_currency: str | None=None, payment_instrument_type: str | None=None, store_id: str | None=None, terminal_id: str | None=None, fields: str | None='transaction_info', balance_affecting_records_only: str | None='Y', page_size: int | None=100, page: int | None=1, request_options: RequestOptionsOrDict | None=None) -> ApiResult[SearchResponse, RawError]:
        ...
