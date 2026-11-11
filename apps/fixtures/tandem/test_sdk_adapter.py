from __future__ import annotations

from collections.abc import Callable
import json
import pytest
import httpx2
from paypal.core import HttpRequest, HttpResponse, TransportError
from paypal.models import Order
from sdk_adapter import (
    BridgeNotSent, BridgeOutcomeUnknown, BufferedResponse, GatewayResult,
    SANDBOX_ORIGIN, SampleBridgeTransport, SdkGateway, WireRequest, money,
)


class Exchange:
    def __init__(self, *replies: tuple[int, object] | Exception) -> None:
        self.replies = list(replies)
        self.requests: list[WireRequest] = []
        self.responses: list[BufferedResponse] = []

    def __call__(self, wire: WireRequest) -> HttpResponse:
        self.requests.append(wire)
        reply = self.replies.pop(0)
        if isinstance(reply, Exception):
            raise reply
        status, payload = reply
        data = payload if isinstance(payload, bytes) else json.dumps(payload).encode()
        response = BufferedResponse(SANDBOX_ORIGIN + wire.path, status, data)
        self.responses.append(response)
        return response


def test_actual_sdk_keeps_durable_identity_and_omits_unrequested_fields() -> None:
    exchange = Exchange((201, {"id": "SAMPLE-O1", "status": "CREATED"}), (201, {"id": "SAMPLE-O1", "status": "CREATED"}))
    transport = SampleBridgeTransport(exchange)
    with SdkGateway(transport) as gateway:
        first = gateway.create_order("ticket-1", 4800, "durable-create-1", authorize=True)
        second = gateway.create_order("ticket-1", 4800, "durable-create-1", authorize=True)
    assert first.kind == second.kind == "observed"
    assert isinstance(first.payload, Order) and first.payload.id == "SAMPLE-O1"
    assert len(exchange.requests) == 2
    a, b = exchange.requests
    assert a.method == "POST" and a.path == "/v2/checkout/orders"
    assert a.headers["paypal-request-id"] == b.headers["paypal-request-id"] == "durable-create-1"
    assert a.headers["idempotency-key"] != b.headers["idempotency-key"]
    assert "authorization" not in a.headers and "client_secret" not in json.dumps(a.body)
    assert a.body == {"intent": "AUTHORIZE", "purchase_units": [{"amount": {"currency_code": "USD", "value": "48.00"}, "custom_id": "ticket-1", "reference_id": "ticket-1"}]}
    assert a.headers["prefer"] == "return=representation" and a.timeout == 20
    assert transport.closed and all(response.closed for response in exchange.responses)


def test_baseline_adapter_does_not_invent_business_identity() -> None:
    exchange = Exchange((201, {"id": "SAMPLE-O1"}))
    with SdkGateway(SampleBridgeTransport(exchange)) as gateway:
        gateway.create_order("ticket-1", 4800, None)
    assert "paypal-request-id" not in exchange.requests[0].headers
    assert "idempotency-key" in exchange.requests[0].headers


@pytest.mark.parametrize(("call", "path", "body"), [
    (lambda g: g.authorize_order("SAMPLE-O1", "a1"), "/v2/checkout/orders/SAMPLE-O1/authorize", {}),
    (lambda g: g.capture_order("SAMPLE-O1", "c1"), "/v2/checkout/orders/SAMPLE-O1/capture", {}),
    (lambda g: g.capture_authorization("SAMPLE-A1", 3000, "partial1", final_capture=False), "/v2/payments/authorizations/SAMPLE-A1/capture", {"amount": {"currency_code": "USD", "value": "30.00"}, "final_capture": False}),
    (lambda g: g.capture_authorization("SAMPLE-A1", 1800, "partial2", final_capture=True), "/v2/payments/authorizations/SAMPLE-A1/capture", {"amount": {"currency_code": "USD", "value": "18.00"}, "final_capture": True}),
    (lambda g: g.refund_capture("SAMPLE-C1", "return-1", 1500, "refund1"), "/v2/payments/captures/SAMPLE-C1/refund", {"amount": {"currency_code": "USD", "value": "15.00"}, "custom_id": "return-1"}),
    (lambda g: g.void_authorization("SAMPLE-A1", "void1"), "/v2/payments/authorizations/SAMPLE-A1/void", None),
])
def test_exact_sdk_write_channels(call: Callable[[SdkGateway], GatewayResult], path: str, body: object) -> None:
    exchange = Exchange((200, {"id": "SAMPLE-RESULT"}))
    with SdkGateway(SampleBridgeTransport(exchange)) as gateway:
        result = call(gateway)
    assert result.kind == "observed"
    request = exchange.requests[0]
    assert len(exchange.requests) == 1 and request.method == "POST"
    assert request.path == path and request.body == body
    assert request.headers["paypal-request-id"] and request.headers["prefer"] == "return=representation"


@pytest.mark.parametrize(("call", "path"), [
    (lambda g: g.get_order("SAMPLE-O1"), "/v2/checkout/orders/SAMPLE-O1"),
    (lambda g: g.get_authorization("SAMPLE-A1"), "/v2/payments/authorizations/SAMPLE-A1"),
    (lambda g: g.get_capture("SAMPLE-C1"), "/v2/payments/captures/SAMPLE-C1"),
    (lambda g: g.get_refund("SAMPLE-R1"), "/v2/payments/refunds/SAMPLE-R1"),
])
def test_reads_keep_the_exact_original_resource(call: Callable[[SdkGateway], GatewayResult], path: str) -> None:
    exchange = Exchange((200, {"id": path.split("/")[-1]}))
    with SdkGateway(SampleBridgeTransport(exchange)) as gateway:
        result = call(gateway)
    assert result.kind == "observed"
    assert len(exchange.requests) == 1 and exchange.requests[0].path == path
    assert exchange.requests[0].method == "GET" and exchange.requests[0].body is None


@pytest.mark.parametrize(("reply", "kind", "code", "status"), [
    ((422, {"name": "UNPROCESSABLE_ENTITY", "message": "private detail", "debug_id": "test"}), "refused", "PROVIDER_REFUSAL", 422),
    ((422, b'not-json-private-error'), "refused", "PROVIDER_REFUSAL", 422),
    ((401, {"name": "NOT_AUTHORIZED", "message": "private detail", "debug_id": "test"}), "refused", "UPSTREAM_AUTHORIZATION", 401),
    ((429, {"anything": "private detail"}), "refused", "UPSTREAM_RATE_LIMIT", 429),
    ((500, {"anything": "private detail"}), "unknown", "ORIGINAL_OUTCOME_UNRESOLVED", 500),
    ((408, {"anything": "private detail"}), "unknown", "ORIGINAL_OUTCOME_UNRESOLVED", 408),
    ((201, b'not-json-private-success'), "unknown", "ORIGINAL_OUTCOME_UNRESOLVED", 201),
    (BridgeNotSent("private proven unsent"), "not_sent", "REQUEST_NOT_SENT", None),
    (BridgeOutcomeUnknown("private lost answer"), "unknown", "ORIGINAL_OUTCOME_UNRESOLVED", None),
    (httpx2.ConnectError("private connect"), "not_sent", "REQUEST_NOT_SENT", None),
    (httpx2.PoolTimeout("private pool"), "not_sent", "REQUEST_NOT_SENT", None),
    (httpx2.ReadTimeout("private read"), "unknown", "ORIGINAL_OUTCOME_UNRESOLVED", None),
])
def test_failures_do_not_hide_retry_or_collapse_uncertainty(reply: tuple[int, object] | Exception, kind: str, code: str, status: int | None) -> None:
    exchange = Exchange(reply)
    with SdkGateway(SampleBridgeTransport(exchange)) as gateway:
        result = gateway.capture_order("SAMPLE-O1", "stable-capture")
    assert (result.kind, result.code, result.provider_status) == (kind, code, status)
    assert result.payload is None and "private" not in repr(result)
    assert len(exchange.requests) == 1


def test_lazy_oauth_refusal_is_unsent_even_with_raw_response() -> None:
    class DeniedAuth:
        def __init__(self) -> None:
            self.calls = 0

        def send(self, request: HttpRequest) -> HttpResponse:
            self.calls += 1
            assert request.url.endswith("/v1/oauth2/token")
            return BufferedResponse(request.url, 401, b'{"error":"invalid_client","error_description":"private credentials"}')

        def close(self) -> None:
            pass

    transport = DeniedAuth()
    with SdkGateway(transport) as gateway:
        result = gateway.create_order("ticket-1", 4800, "create-1")
    assert (result.kind, result.code, result.provider_status) == ("not_sent", "AUTHENTICATION_UNAVAILABLE", 401)
    assert transport.calls == 1 and result.payload is None


def test_empty_void_remains_unknown_until_a_separate_read() -> None:
    exchange = Exchange((204, b''), (200, {"id": "SAMPLE-A1", "status": "VOIDED"}))
    with SdkGateway(SampleBridgeTransport(exchange)) as gateway:
        result = gateway.void_authorization("SAMPLE-A1", "void-1")
        assert result.kind == "unknown" and len(exchange.requests) == 1
        observation = gateway.get_authorization("SAMPLE-A1")
    assert observation.kind == "observed" and len(exchange.requests) == 2
    assert [request.method for request in exchange.requests] == ["POST", "GET"]


def test_transport_rejects_destination_without_calling_host() -> None:
    exchange = Exchange()
    transport = SampleBridgeTransport(exchange)
    with pytest.raises(TransportError):
        transport.send(HttpRequest(method="POST", url="https://api-m.sandbox.paypal.com.evil.test/v2/checkout/orders", headers={}))
    assert exchange.requests == []


@pytest.mark.parametrize("minor", [0, -1, True, 1_000_001])
def test_money_refuses_invalid_minor_units_before_a_request(minor: int) -> None:
    with pytest.raises(ValueError):
        money(minor)
