from __future__ import annotations
from uuid import UUID, uuid4
from ..auth import AsyncAuthSchemes, AuthSchemes
from ..core import ApiResult, AsyncRawClient, RawClient, RequestOptionsOrDict, SecuredRawResponse, async_empty_response, async_json_decoder, empty_response, json_body, json_decoder, param, unwrap
from ..errors.authorize_order_error import AuthorizeOrderErrorBody, authorize_order_error_mapper
from ..errors.capture_order_error import CaptureOrderErrorBody, capture_order_error_mapper
from ..errors.confirm_order_error import ConfirmOrderErrorBody, confirm_order_error_mapper
from ..errors.create_order_error import CreateOrderErrorBody, create_order_error_mapper
from ..errors.create_order_tracking_error import CreateOrderTrackingErrorBody, create_order_tracking_error_mapper
from ..errors.get_order_error import GetOrderErrorBody, get_order_error_mapper
from ..errors.patch_order_error import PatchOrderErrorBody, patch_order_error_mapper
from ..errors.update_order_tracking_error import UpdateOrderTrackingErrorBody, update_order_tracking_error_mapper
from ..models.confirm_order_request import ConfirmOrderRequest, ConfirmOrderRequestDict
from ..models.order import Order
from ..models.order_authorize_request import OrderAuthorizeRequest, OrderAuthorizeRequestDict
from ..models.order_authorize_response import OrderAuthorizeResponse
from ..models.order_capture_request import OrderCaptureRequest, OrderCaptureRequestDict
from ..models.order_request import OrderRequest, OrderRequestDict
from ..models.order_tracker_request import OrderTrackerRequest, OrderTrackerRequestDict
from ..models.patch import Patch, PatchDict
from ..server.server import Server

class Orders:

    def __init__(self, client: RawClient, server: Server, auth: AuthSchemes) -> None:
        ...

    def authorize_order(self, id_: str, *, pay_pal_mock_response: str | None=None, pay_pal_request_id: str | None=None, prefer: str | None='return=minimal', pay_pal_client_metadata_id: str | None=None, pay_pal_auth_assertion: str | None=None, body: OrderAuthorizeRequest | OrderAuthorizeRequestDict | None=None, request_options: RequestOptionsOrDict | None=None) -> OrderAuthorizeResponse:
        ...

    def capture_order(self, id_: str, *, pay_pal_mock_response: str | None=None, pay_pal_request_id: str | None=None, prefer: str | None='return=minimal', pay_pal_client_metadata_id: str | None=None, pay_pal_auth_assertion: str | None=None, body: OrderCaptureRequest | OrderCaptureRequestDict | None=None, request_options: RequestOptionsOrDict | None=None) -> Order:
        ...

    def confirm_order(self, id_: str, *, pay_pal_client_metadata_id: str | None=None, pay_pal_auth_assertion: str | None=None, prefer: str | None='return=minimal', body: ConfirmOrderRequest | ConfirmOrderRequestDict | None=None, request_options: RequestOptionsOrDict | None=None) -> Order:
        ...

    def create_order(self, body: OrderRequest | OrderRequestDict, *, pay_pal_mock_response: str | None=None, pay_pal_request_id: str | None=None, pay_pal_partner_attribution_id: str | None=None, pay_pal_client_metadata_id: str | None=None, prefer: str | None='return=minimal', pay_pal_auth_assertion: str | None=None, request_options: RequestOptionsOrDict | None=None) -> Order:
        ...

    def create_order_tracking(self, id_: str, body: OrderTrackerRequest | OrderTrackerRequestDict, *, pay_pal_auth_assertion: str | None=None, request_options: RequestOptionsOrDict | None=None) -> Order:
        ...

    def get_order(self, id_: str, *, fields: str | None=None, pay_pal_mock_response: str | None=None, pay_pal_auth_assertion: str | None=None, request_options: RequestOptionsOrDict | None=None) -> Order:
        ...

    def patch_order(self, id_: str, *, pay_pal_mock_response: str | None=None, pay_pal_auth_assertion: str | None=None, body: list[Patch | PatchDict] | None=None, request_options: RequestOptionsOrDict | None=None) -> None:
        ...

    def update_order_tracking(self, id_: str, tracker_id: str, *, pay_pal_auth_assertion: str | None=None, body: list[Patch | PatchDict] | None=None, request_options: RequestOptionsOrDict | None=None) -> None:
        ...

    @property
    def with_raw_response(self) -> OrdersWithRawResponse:
        ...

class AsyncOrders:

    def __init__(self, client: AsyncRawClient, server: Server, auth: AsyncAuthSchemes) -> None:
        ...

    async def authorize_order(self, id_: str, *, pay_pal_mock_response: str | None=None, pay_pal_request_id: str | None=None, prefer: str | None='return=minimal', pay_pal_client_metadata_id: str | None=None, pay_pal_auth_assertion: str | None=None, body: OrderAuthorizeRequest | OrderAuthorizeRequestDict | None=None, request_options: RequestOptionsOrDict | None=None) -> OrderAuthorizeResponse:
        ...

    async def capture_order(self, id_: str, *, pay_pal_mock_response: str | None=None, pay_pal_request_id: str | None=None, prefer: str | None='return=minimal', pay_pal_client_metadata_id: str | None=None, pay_pal_auth_assertion: str | None=None, body: OrderCaptureRequest | OrderCaptureRequestDict | None=None, request_options: RequestOptionsOrDict | None=None) -> Order:
        ...

    async def confirm_order(self, id_: str, *, pay_pal_client_metadata_id: str | None=None, pay_pal_auth_assertion: str | None=None, prefer: str | None='return=minimal', body: ConfirmOrderRequest | ConfirmOrderRequestDict | None=None, request_options: RequestOptionsOrDict | None=None) -> Order:
        ...

    async def create_order(self, body: OrderRequest | OrderRequestDict, *, pay_pal_mock_response: str | None=None, pay_pal_request_id: str | None=None, pay_pal_partner_attribution_id: str | None=None, pay_pal_client_metadata_id: str | None=None, prefer: str | None='return=minimal', pay_pal_auth_assertion: str | None=None, request_options: RequestOptionsOrDict | None=None) -> Order:
        ...

    async def create_order_tracking(self, id_: str, body: OrderTrackerRequest | OrderTrackerRequestDict, *, pay_pal_auth_assertion: str | None=None, request_options: RequestOptionsOrDict | None=None) -> Order:
        ...

    async def get_order(self, id_: str, *, fields: str | None=None, pay_pal_mock_response: str | None=None, pay_pal_auth_assertion: str | None=None, request_options: RequestOptionsOrDict | None=None) -> Order:
        ...

    async def patch_order(self, id_: str, *, pay_pal_mock_response: str | None=None, pay_pal_auth_assertion: str | None=None, body: list[Patch | PatchDict] | None=None, request_options: RequestOptionsOrDict | None=None) -> None:
        ...

    async def update_order_tracking(self, id_: str, tracker_id: str, *, pay_pal_auth_assertion: str | None=None, body: list[Patch | PatchDict] | None=None, request_options: RequestOptionsOrDict | None=None) -> None:
        ...

    @property
    def with_raw_response(self) -> AsyncOrdersWithRawResponse:
        ...

class OrdersWithRawResponse(SecuredRawResponse[RawClient, Server, AuthSchemes]):

    def authorize_order(self, id_: str, *, pay_pal_mock_response: str | None=None, pay_pal_request_id: str | None=None, prefer: str | None='return=minimal', pay_pal_client_metadata_id: str | None=None, pay_pal_auth_assertion: str | None=None, body: OrderAuthorizeRequest | OrderAuthorizeRequestDict | None=None, request_options: RequestOptionsOrDict | None=None) -> ApiResult[OrderAuthorizeResponse, AuthorizeOrderErrorBody]:
        ...

    def capture_order(self, id_: str, *, pay_pal_mock_response: str | None=None, pay_pal_request_id: str | None=None, prefer: str | None='return=minimal', pay_pal_client_metadata_id: str | None=None, pay_pal_auth_assertion: str | None=None, body: OrderCaptureRequest | OrderCaptureRequestDict | None=None, request_options: RequestOptionsOrDict | None=None) -> ApiResult[Order, CaptureOrderErrorBody]:
        ...

    def confirm_order(self, id_: str, *, pay_pal_client_metadata_id: str | None=None, pay_pal_auth_assertion: str | None=None, prefer: str | None='return=minimal', body: ConfirmOrderRequest | ConfirmOrderRequestDict | None=None, request_options: RequestOptionsOrDict | None=None) -> ApiResult[Order, ConfirmOrderErrorBody]:
        ...

    def create_order(self, body: OrderRequest | OrderRequestDict, *, pay_pal_mock_response: str | None=None, pay_pal_request_id: str | None=None, pay_pal_partner_attribution_id: str | None=None, pay_pal_client_metadata_id: str | None=None, prefer: str | None='return=minimal', pay_pal_auth_assertion: str | None=None, request_options: RequestOptionsOrDict | None=None) -> ApiResult[Order, CreateOrderErrorBody]:
        ...

    def create_order_tracking(self, id_: str, body: OrderTrackerRequest | OrderTrackerRequestDict, *, pay_pal_auth_assertion: str | None=None, request_options: RequestOptionsOrDict | None=None) -> ApiResult[Order, CreateOrderTrackingErrorBody]:
        ...

    def get_order(self, id_: str, *, fields: str | None=None, pay_pal_mock_response: str | None=None, pay_pal_auth_assertion: str | None=None, request_options: RequestOptionsOrDict | None=None) -> ApiResult[Order, GetOrderErrorBody]:
        ...

    def patch_order(self, id_: str, *, pay_pal_mock_response: str | None=None, pay_pal_auth_assertion: str | None=None, body: list[Patch | PatchDict] | None=None, request_options: RequestOptionsOrDict | None=None) -> ApiResult[None, PatchOrderErrorBody]:
        ...

    def update_order_tracking(self, id_: str, tracker_id: str, *, pay_pal_auth_assertion: str | None=None, body: list[Patch | PatchDict] | None=None, request_options: RequestOptionsOrDict | None=None) -> ApiResult[None, UpdateOrderTrackingErrorBody]:
        ...

class AsyncOrdersWithRawResponse(SecuredRawResponse[AsyncRawClient, Server, AsyncAuthSchemes]):

    async def authorize_order(self, id_: str, *, pay_pal_mock_response: str | None=None, pay_pal_request_id: str | None=None, prefer: str | None='return=minimal', pay_pal_client_metadata_id: str | None=None, pay_pal_auth_assertion: str | None=None, body: OrderAuthorizeRequest | OrderAuthorizeRequestDict | None=None, request_options: RequestOptionsOrDict | None=None) -> ApiResult[OrderAuthorizeResponse, AuthorizeOrderErrorBody]:
        ...

    async def capture_order(self, id_: str, *, pay_pal_mock_response: str | None=None, pay_pal_request_id: str | None=None, prefer: str | None='return=minimal', pay_pal_client_metadata_id: str | None=None, pay_pal_auth_assertion: str | None=None, body: OrderCaptureRequest | OrderCaptureRequestDict | None=None, request_options: RequestOptionsOrDict | None=None) -> ApiResult[Order, CaptureOrderErrorBody]:
        ...

    async def confirm_order(self, id_: str, *, pay_pal_client_metadata_id: str | None=None, pay_pal_auth_assertion: str | None=None, prefer: str | None='return=minimal', body: ConfirmOrderRequest | ConfirmOrderRequestDict | None=None, request_options: RequestOptionsOrDict | None=None) -> ApiResult[Order, ConfirmOrderErrorBody]:
        ...

    async def create_order(self, body: OrderRequest | OrderRequestDict, *, pay_pal_mock_response: str | None=None, pay_pal_request_id: str | None=None, pay_pal_partner_attribution_id: str | None=None, pay_pal_client_metadata_id: str | None=None, prefer: str | None='return=minimal', pay_pal_auth_assertion: str | None=None, request_options: RequestOptionsOrDict | None=None) -> ApiResult[Order, CreateOrderErrorBody]:
        ...

    async def create_order_tracking(self, id_: str, body: OrderTrackerRequest | OrderTrackerRequestDict, *, pay_pal_auth_assertion: str | None=None, request_options: RequestOptionsOrDict | None=None) -> ApiResult[Order, CreateOrderTrackingErrorBody]:
        ...

    async def get_order(self, id_: str, *, fields: str | None=None, pay_pal_mock_response: str | None=None, pay_pal_auth_assertion: str | None=None, request_options: RequestOptionsOrDict | None=None) -> ApiResult[Order, GetOrderErrorBody]:
        ...

    async def patch_order(self, id_: str, *, pay_pal_mock_response: str | None=None, pay_pal_auth_assertion: str | None=None, body: list[Patch | PatchDict] | None=None, request_options: RequestOptionsOrDict | None=None) -> ApiResult[None, PatchOrderErrorBody]:
        ...

    async def update_order_tracking(self, id_: str, tracker_id: str, *, pay_pal_auth_assertion: str | None=None, body: list[Patch | PatchDict] | None=None, request_options: RequestOptionsOrDict | None=None) -> ApiResult[None, UpdateOrderTrackingErrorBody]:
        ...
