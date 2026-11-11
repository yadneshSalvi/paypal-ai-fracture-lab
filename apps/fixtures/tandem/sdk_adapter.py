"""Pinned SDK boundary for Tandem's credential-free, synchronous Sample worker.

This layer deliberately does not claim business operations or authorize writes.
The faulty and hardened targets own those decisions; the host observes the SDK's
actual request. No API response alone establishes paid ticket eligibility.
"""
from __future__ import annotations

from collections.abc import Callable, Iterator, Mapping
from dataclasses import dataclass, field
import json
from types import TracebackType
from typing import Literal, TypeVar
from urllib.parse import urlsplit
import httpx2

from paypal import PaypalClient
from paypal.core import (
    ApiError, ApiResult, ClientCredentials, Failure, HttpClient, HttpRequest,
    HttpResponse, JsonBody, SdkBaseModel, Success, TransportError,
)
from paypal.models import (
    AmountWithBreakdown, CaptureRequest, Money, OrderAuthorizeRequest,
    OrderCaptureRequest, OrderRequest, PurchaseUnitRequest, RefundRequest,
)
from paypal.models.enums import CheckoutPaymentIntent

SANDBOX_ORIGIN = "https://api-m.sandbox.paypal.com"
Payload = TypeVar("Payload", bound=SdkBaseModel)
ErrorPayload = TypeVar("ErrorPayload")


class BridgeNotSent(Exception):
    """The host proved that this particular request was not dispatched."""


class BridgeOutcomeUnknown(Exception):
    """The original request may have committed; never repeat it implicitly."""


@dataclass(frozen=True)
class WireRequest:
    method: str
    path: str
    headers: Mapping[str, str]
    body: object
    timeout: float


@dataclass
class BufferedResponse:
    url: str
    status_code: int
    body: bytes
    headers: Mapping[str, str] = field(default_factory=lambda: {"content-type": "application/json"})
    closed: bool = False

    def read(self) -> bytes:
        self.close()
        return self.body

    def iter_bytes(self, chunk_size: int | None) -> Iterator[bytes]:
        if chunk_size is not None and chunk_size <= 0:
            raise ValueError("Chunk size must be positive")
        step = chunk_size or max(len(self.body), 1)
        for offset in range(0, len(self.body), step):
            yield self.body[offset:offset + step]
        self.close()

    def close(self) -> None:
        self.closed = True


class SampleBridgeTransport:
    """No network client exists here. Only a bounded host callback is reachable."""

    def __init__(self, exchange: Callable[[WireRequest], HttpResponse]) -> None:
        self.exchange = exchange
        self.closed = False

    def send(self, request: HttpRequest) -> HttpResponse:
        parsed = urlsplit(request.url)
        if self.closed or parsed.scheme != "https" or parsed.netloc != "api-m.sandbox.paypal.com" or parsed.query or parsed.fragment:
            error = BridgeNotSent("The Sample transport refused the destination")
            raise TransportError(error) from error
        if request.method == "POST" and parsed.path == "/v1/oauth2/token":
            # Both credentials and this token are explicitly fictional; neither
            # the request body nor its Authorization header crosses the bridge.
            return BufferedResponse(request.url, 200, b'{"access_token":"SAMPLE-TANDEM-TOKEN","token_type":"Bearer","expires_in":3600}')
        if request.body is not None and not isinstance(request.body, JsonBody):
            error = BridgeNotSent("Only JSON SDK operations are supported")
            raise TransportError(error) from error
        body: object = request.body.value if isinstance(request.body, JsonBody) else None
        if len(json.dumps(body, ensure_ascii=False).encode()) > 131_072:
            error = BridgeNotSent("The Sample request exceeded its bound")
            raise TransportError(error) from error
        visible_headers = {key: value for key, value in request.headers.items() if key in {
            "content-type", "accept", "paypal-request-id", "idempotency-key", "prefer",
        }}
        wire = WireRequest(request.method, parsed.path, visible_headers, body, min(request.timeout or 20.0, 20.0))
        try:
            return self.exchange(wire)
        except (BridgeNotSent, BridgeOutcomeUnknown) as error:
            raise TransportError(error) from error

    def close(self) -> None:
        self.closed = True


@dataclass
class WireObservation:
    operation_sent: bool = False
    status: int | None = None


class ObservedTransport:
    def __init__(self, transport: HttpClient) -> None:
        self.transport = transport
        self.observation = WireObservation()

    def send(self, request: HttpRequest) -> HttpResponse:
        operation = urlsplit(request.url).path != "/v1/oauth2/token"
        if operation:
            self.observation.operation_sent = True
        response = self.transport.send(request)
        if operation:
            self.observation.status = response.status_code
        return response

    def close(self) -> None:
        self.transport.close()


@dataclass(frozen=True)
class GatewayResult:
    kind: Literal["observed", "refused", "not_sent", "unknown"]
    code: str
    provider_status: int | None
    payload: SdkBaseModel | None = None


def money(minor: int) -> Money:
    if isinstance(minor, bool) or not isinstance(minor, int) or not 0 < minor <= 1_000_000:
        raise ValueError("Tandem requires bounded positive whole USD cents")
    return Money(currency_code="USD", value=f"{minor // 100}.{minor % 100:02d}")


class SdkGateway:
    def __init__(self, transport: HttpClient) -> None:
        self.transport = ObservedTransport(transport)
        self.client = PaypalClient(
            base_url=SANDBOX_ORIGIN, timeout=20.0, retry_options=0,
            custom_http_client=self.transport,
            oauth2=ClientCredentials(client_id="SAMPLE-TANDEM", client_secret="SAMPLE-NOT-A-CREDENTIAL"),
        )

    def __enter__(self) -> SdkGateway:
        return self

    def __exit__(self, kind: type[BaseException] | None, error: BaseException | None, trace: TracebackType | None) -> None:
        self.client.close()

    def _call(self, operation: Callable[[], ApiResult[Payload, ErrorPayload]]) -> GatewayResult:
        self.transport.observation = WireObservation()
        try:
            result = operation()
            if isinstance(result, Success):
                return GatewayResult("observed", "RESOURCE_OBSERVED", result.status_code, result.payload)
            if isinstance(result, Failure):
                return self._http_failure(result.status_code)
            raise TypeError("Unsupported SDK result")
        except (BridgeNotSent, httpx2.ConnectError, httpx2.ConnectTimeout, httpx2.PoolTimeout, httpx2.ProxyError):
            return GatewayResult("not_sent", "REQUEST_NOT_SENT", None)
        except ApiError as error:
            # Lazy OAuth errors occur before an operation was sent, even in raw mode.
            if not self.transport.observation.operation_sent:
                return GatewayResult("not_sent", "AUTHENTICATION_UNAVAILABLE", error.status_code)
            return self._http_failure(error.status_code)
        except (BridgeOutcomeUnknown, TimeoutError, ConnectionError, httpx2.RequestError, ValueError):
            observed = self.transport.observation
            if not observed.operation_sent:
                return GatewayResult("not_sent", "REQUEST_NOT_SENT", observed.status)
            if observed.status is not None and 400 <= observed.status < 500 and observed.status != 408:
                return self._http_failure(observed.status)
            return GatewayResult("unknown", "ORIGINAL_OUTCOME_UNRESOLVED", observed.status)

    @staticmethod
    def _http_failure(status: int) -> GatewayResult:
        if 400 <= status < 500 and status != 408:
            code = "UPSTREAM_AUTHORIZATION" if status in (401, 403) else "UPSTREAM_RATE_LIMIT" if status == 429 else "PROVIDER_REFUSAL"
            return GatewayResult("refused", code, status)
        return GatewayResult("unknown", "ORIGINAL_OUTCOME_UNRESOLVED", status)

    def create_order(self, intent: str, minor: int, request_id: str | None, *, authorize: bool = False) -> GatewayResult:
        amount = money(minor)
        body = OrderRequest(
            intent=CheckoutPaymentIntent.AUTHORIZE if authorize else CheckoutPaymentIntent.CAPTURE,
            purchase_units=[PurchaseUnitRequest(amount=AmountWithBreakdown(currency_code=amount.currency_code, value=amount.value), custom_id=intent, reference_id=intent)],
        )
        return self._call(lambda: self.client.orders.with_raw_response.create_order(body, pay_pal_request_id=request_id, prefer="return=representation"))

    def authorize_order(self, order_id: str, request_id: str | None) -> GatewayResult:
        body = OrderAuthorizeRequest()
        return self._call(lambda: self.client.orders.with_raw_response.authorize_order(order_id, pay_pal_request_id=request_id, prefer="return=representation", body=body))

    def capture_order(self, order_id: str, request_id: str | None) -> GatewayResult:
        body = OrderCaptureRequest()
        return self._call(lambda: self.client.orders.with_raw_response.capture_order(order_id, pay_pal_request_id=request_id, prefer="return=representation", body=body))

    def get_order(self, order_id: str) -> GatewayResult:
        return self._call(lambda: self.client.orders.with_raw_response.get_order(order_id))

    def capture_authorization(self, authorization_id: str, minor: int, request_id: str | None, *, final_capture: bool) -> GatewayResult:
        body = CaptureRequest(amount=money(minor), final_capture=final_capture)
        return self._call(lambda: self.client.payments.with_raw_response.capture_authorized_payment(authorization_id, pay_pal_request_id=request_id, prefer="return=representation", body=body))

    def get_authorization(self, authorization_id: str) -> GatewayResult:
        return self._call(lambda: self.client.payments.with_raw_response.get_authorized_payment(authorization_id))

    def get_capture(self, capture_id: str) -> GatewayResult:
        return self._call(lambda: self.client.payments.with_raw_response.get_captured_payment(capture_id))

    def get_refund(self, refund_id: str) -> GatewayResult:
        return self._call(lambda: self.client.payments.with_raw_response.get_refund(refund_id))

    def refund_capture(self, capture_id: str, intent: str, minor: int, request_id: str | None) -> GatewayResult:
        body = RefundRequest(amount=money(minor), custom_id=intent)
        return self._call(lambda: self.client.payments.with_raw_response.refund_captured_payment(capture_id, pay_pal_request_id=request_id, prefer="return=representation", body=body))

    def void_authorization(self, authorization_id: str, request_id: str | None) -> GatewayResult:
        return self._call(lambda: self.client.payments.with_raw_response.void_payment(authorization_id, pay_pal_request_id=request_id, prefer="return=representation"))
