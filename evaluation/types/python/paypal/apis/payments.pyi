from __future__ import annotations
from uuid import UUID, uuid4
from ..auth import AsyncAuthSchemes, AuthSchemes
from ..core import ApiResult, AsyncRawClient, RawClient, RequestOptionsOrDict, SecuredRawResponse, async_json_decoder, json_body, json_decoder, param, unwrap
from ..errors.capture_authorized_payment_error import CaptureAuthorizedPaymentErrorBody, capture_authorized_payment_error_mapper
from ..errors.get_authorized_payment_error import GetAuthorizedPaymentErrorBody, get_authorized_payment_error_mapper
from ..errors.get_captured_payment_error import GetCapturedPaymentErrorBody, get_captured_payment_error_mapper
from ..errors.get_refund_error import GetRefundErrorBody, get_refund_error_mapper
from ..errors.reauthorize_payment_error import ReauthorizePaymentErrorBody, reauthorize_payment_error_mapper
from ..errors.refund_captured_payment_error import RefundCapturedPaymentErrorBody, refund_captured_payment_error_mapper
from ..errors.void_payment_error import VoidPaymentErrorBody, void_payment_error_mapper
from ..models.capture_request import CaptureRequest, CaptureRequestDict
from ..models.captured_payment import CapturedPayment
from ..models.payment_authorization import PaymentAuthorization
from ..models.reauthorize_request import ReauthorizeRequest, ReauthorizeRequestDict
from ..models.refund import Refund
from ..models.refund_request import RefundRequest, RefundRequestDict
from ..server.server import Server

class Payments:

    def __init__(self, client: RawClient, server: Server, auth: AuthSchemes) -> None:
        ...

    def capture_authorized_payment(self, authorization_id: str, *, pay_pal_mock_response: str | None=None, pay_pal_request_id: str | None=None, prefer: str | None='return=minimal', pay_pal_auth_assertion: str | None=None, body: CaptureRequest | CaptureRequestDict | None=None, request_options: RequestOptionsOrDict | None=None) -> CapturedPayment:
        ...

    def get_authorized_payment(self, authorization_id: str, *, pay_pal_mock_response: str | None=None, pay_pal_auth_assertion: str | None=None, request_options: RequestOptionsOrDict | None=None) -> PaymentAuthorization:
        ...

    def get_captured_payment(self, capture_id: str, *, pay_pal_mock_response: str | None=None, request_options: RequestOptionsOrDict | None=None) -> CapturedPayment:
        ...

    def get_refund(self, refund_id: str, *, pay_pal_mock_response: str | None=None, pay_pal_auth_assertion: str | None=None, request_options: RequestOptionsOrDict | None=None) -> Refund:
        ...

    def reauthorize_payment(self, authorization_id: str, *, pay_pal_request_id: str | None=None, prefer: str | None='return=minimal', pay_pal_auth_assertion: str | None=None, body: ReauthorizeRequest | ReauthorizeRequestDict | None=None, request_options: RequestOptionsOrDict | None=None) -> PaymentAuthorization:
        ...

    def refund_captured_payment(self, capture_id: str, *, pay_pal_mock_response: str | None=None, pay_pal_request_id: str | None=None, prefer: str | None='return=minimal', pay_pal_auth_assertion: str | None=None, body: RefundRequest | RefundRequestDict | None=None, request_options: RequestOptionsOrDict | None=None) -> Refund:
        ...

    def void_payment(self, authorization_id: str, *, pay_pal_mock_response: str | None=None, pay_pal_auth_assertion: str | None=None, pay_pal_request_id: str | None=None, prefer: str | None='return=minimal', request_options: RequestOptionsOrDict | None=None) -> PaymentAuthorization:
        ...

    @property
    def with_raw_response(self) -> PaymentsWithRawResponse:
        ...

class AsyncPayments:

    def __init__(self, client: AsyncRawClient, server: Server, auth: AsyncAuthSchemes) -> None:
        ...

    async def capture_authorized_payment(self, authorization_id: str, *, pay_pal_mock_response: str | None=None, pay_pal_request_id: str | None=None, prefer: str | None='return=minimal', pay_pal_auth_assertion: str | None=None, body: CaptureRequest | CaptureRequestDict | None=None, request_options: RequestOptionsOrDict | None=None) -> CapturedPayment:
        ...

    async def get_authorized_payment(self, authorization_id: str, *, pay_pal_mock_response: str | None=None, pay_pal_auth_assertion: str | None=None, request_options: RequestOptionsOrDict | None=None) -> PaymentAuthorization:
        ...

    async def get_captured_payment(self, capture_id: str, *, pay_pal_mock_response: str | None=None, request_options: RequestOptionsOrDict | None=None) -> CapturedPayment:
        ...

    async def get_refund(self, refund_id: str, *, pay_pal_mock_response: str | None=None, pay_pal_auth_assertion: str | None=None, request_options: RequestOptionsOrDict | None=None) -> Refund:
        ...

    async def reauthorize_payment(self, authorization_id: str, *, pay_pal_request_id: str | None=None, prefer: str | None='return=minimal', pay_pal_auth_assertion: str | None=None, body: ReauthorizeRequest | ReauthorizeRequestDict | None=None, request_options: RequestOptionsOrDict | None=None) -> PaymentAuthorization:
        ...

    async def refund_captured_payment(self, capture_id: str, *, pay_pal_mock_response: str | None=None, pay_pal_request_id: str | None=None, prefer: str | None='return=minimal', pay_pal_auth_assertion: str | None=None, body: RefundRequest | RefundRequestDict | None=None, request_options: RequestOptionsOrDict | None=None) -> Refund:
        ...

    async def void_payment(self, authorization_id: str, *, pay_pal_mock_response: str | None=None, pay_pal_auth_assertion: str | None=None, pay_pal_request_id: str | None=None, prefer: str | None='return=minimal', request_options: RequestOptionsOrDict | None=None) -> PaymentAuthorization:
        ...

    @property
    def with_raw_response(self) -> AsyncPaymentsWithRawResponse:
        ...

class PaymentsWithRawResponse(SecuredRawResponse[RawClient, Server, AuthSchemes]):

    def capture_authorized_payment(self, authorization_id: str, *, pay_pal_mock_response: str | None=None, pay_pal_request_id: str | None=None, prefer: str | None='return=minimal', pay_pal_auth_assertion: str | None=None, body: CaptureRequest | CaptureRequestDict | None=None, request_options: RequestOptionsOrDict | None=None) -> ApiResult[CapturedPayment, CaptureAuthorizedPaymentErrorBody]:
        ...

    def get_authorized_payment(self, authorization_id: str, *, pay_pal_mock_response: str | None=None, pay_pal_auth_assertion: str | None=None, request_options: RequestOptionsOrDict | None=None) -> ApiResult[PaymentAuthorization, GetAuthorizedPaymentErrorBody]:
        ...

    def get_captured_payment(self, capture_id: str, *, pay_pal_mock_response: str | None=None, request_options: RequestOptionsOrDict | None=None) -> ApiResult[CapturedPayment, GetCapturedPaymentErrorBody]:
        ...

    def get_refund(self, refund_id: str, *, pay_pal_mock_response: str | None=None, pay_pal_auth_assertion: str | None=None, request_options: RequestOptionsOrDict | None=None) -> ApiResult[Refund, GetRefundErrorBody]:
        ...

    def reauthorize_payment(self, authorization_id: str, *, pay_pal_request_id: str | None=None, prefer: str | None='return=minimal', pay_pal_auth_assertion: str | None=None, body: ReauthorizeRequest | ReauthorizeRequestDict | None=None, request_options: RequestOptionsOrDict | None=None) -> ApiResult[PaymentAuthorization, ReauthorizePaymentErrorBody]:
        ...

    def refund_captured_payment(self, capture_id: str, *, pay_pal_mock_response: str | None=None, pay_pal_request_id: str | None=None, prefer: str | None='return=minimal', pay_pal_auth_assertion: str | None=None, body: RefundRequest | RefundRequestDict | None=None, request_options: RequestOptionsOrDict | None=None) -> ApiResult[Refund, RefundCapturedPaymentErrorBody]:
        ...

    def void_payment(self, authorization_id: str, *, pay_pal_mock_response: str | None=None, pay_pal_auth_assertion: str | None=None, pay_pal_request_id: str | None=None, prefer: str | None='return=minimal', request_options: RequestOptionsOrDict | None=None) -> ApiResult[PaymentAuthorization, VoidPaymentErrorBody]:
        ...

class AsyncPaymentsWithRawResponse(SecuredRawResponse[AsyncRawClient, Server, AsyncAuthSchemes]):

    async def capture_authorized_payment(self, authorization_id: str, *, pay_pal_mock_response: str | None=None, pay_pal_request_id: str | None=None, prefer: str | None='return=minimal', pay_pal_auth_assertion: str | None=None, body: CaptureRequest | CaptureRequestDict | None=None, request_options: RequestOptionsOrDict | None=None) -> ApiResult[CapturedPayment, CaptureAuthorizedPaymentErrorBody]:
        ...

    async def get_authorized_payment(self, authorization_id: str, *, pay_pal_mock_response: str | None=None, pay_pal_auth_assertion: str | None=None, request_options: RequestOptionsOrDict | None=None) -> ApiResult[PaymentAuthorization, GetAuthorizedPaymentErrorBody]:
        ...

    async def get_captured_payment(self, capture_id: str, *, pay_pal_mock_response: str | None=None, request_options: RequestOptionsOrDict | None=None) -> ApiResult[CapturedPayment, GetCapturedPaymentErrorBody]:
        ...

    async def get_refund(self, refund_id: str, *, pay_pal_mock_response: str | None=None, pay_pal_auth_assertion: str | None=None, request_options: RequestOptionsOrDict | None=None) -> ApiResult[Refund, GetRefundErrorBody]:
        ...

    async def reauthorize_payment(self, authorization_id: str, *, pay_pal_request_id: str | None=None, prefer: str | None='return=minimal', pay_pal_auth_assertion: str | None=None, body: ReauthorizeRequest | ReauthorizeRequestDict | None=None, request_options: RequestOptionsOrDict | None=None) -> ApiResult[PaymentAuthorization, ReauthorizePaymentErrorBody]:
        ...

    async def refund_captured_payment(self, capture_id: str, *, pay_pal_mock_response: str | None=None, pay_pal_request_id: str | None=None, prefer: str | None='return=minimal', pay_pal_auth_assertion: str | None=None, body: RefundRequest | RefundRequestDict | None=None, request_options: RequestOptionsOrDict | None=None) -> ApiResult[Refund, RefundCapturedPaymentErrorBody]:
        ...

    async def void_payment(self, authorization_id: str, *, pay_pal_mock_response: str | None=None, pay_pal_auth_assertion: str | None=None, pay_pal_request_id: str | None=None, prefer: str | None='return=minimal', request_options: RequestOptionsOrDict | None=None) -> ApiResult[PaymentAuthorization, VoidPaymentErrorBody]:
        ...
