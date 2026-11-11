<!-- Generated file — do not edit; regenerated with the SDK. -->

# Payments — operations

Accessor: `client.payments` · Source: `paypal/apis/payments.py` · 7 operations

Each `###` block is one operation and assumes `sdk-map.md` is loaded: blocks omit what its invariants table covers and are otherwise self-contained, so chunk at block level. Signatures are the sync parsed spelling; the async and raw spellings take the same parameters (see sdk-map.md). **Type sources** names the module declaring each type an operation mentions, so resolving a body, return or error payload is a lookup rather than a search; the runtime types `RawError` and `ApiResult` are excluded.

### client.payments.capture_authorized_payment

- **Route**: `POST /v2/payments/authorizations/{authorization_id}/capture`
- **Auth**: `oauth2`
- **Signature**: `def capture_authorized_payment(authorization_id: str, *, pay_pal_mock_response: str | None = None, pay_pal_request_id: str | None = None, prefer: str | None = "return=minimal", pay_pal_auth_assertion: str | None = None, body: CaptureRequest | CaptureRequestDict | None = None, request_options: RequestOptionsOrDict | None = None)`
  - required, positional: `authorization_id`
- **Params**: `authorization_id` — path · `pay_pal_mock_response` — header `PayPal-Mock-Response` · `pay_pal_request_id` — header `PayPal-Request-Id` · `prefer` — header `Prefer` · `pay_pal_auth_assertion` — header `PayPal-Auth-Assertion` · `body` — JSON body
- **Returns (parsed)**: `CapturedPayment`
- **Returns (raw)**: `ApiResult[CapturedPayment, CaptureAuthorizedPaymentErrorBody]`
- **Error**: `CaptureAuthorizedPaymentErrorBody` — **Case A (typed)**
- **Error arms**: `Error` [400, 401, 403, 404, 409, 422] · `RawError` [500, anything unmapped]

| Type | Source |
| --- | --- |
| `CaptureRequest` | `paypal/models/capture_request.py` |
| `CaptureRequestDict` | `paypal/models/capture_request.py` |
| `CapturedPayment` | `paypal/models/captured_payment.py` |
| `CaptureAuthorizedPaymentErrorBody` | `paypal/errors/capture_authorized_payment_error.py` |
| `Error` | `paypal/models/error.py` |

### client.payments.get_authorized_payment

- **Route**: `GET /v2/payments/authorizations/{authorization_id}`
- **Auth**: `oauth2`
- **Signature**: `def get_authorized_payment(authorization_id: str, *, pay_pal_mock_response: str | None = None, pay_pal_auth_assertion: str | None = None, request_options: RequestOptionsOrDict | None = None)`
  - required, positional: `authorization_id`
- **Params**: `authorization_id` — path · `pay_pal_mock_response` — header `PayPal-Mock-Response` · `pay_pal_auth_assertion` — header `PayPal-Auth-Assertion`
- **Returns (parsed)**: `PaymentAuthorization`
- **Returns (raw)**: `ApiResult[PaymentAuthorization, GetAuthorizedPaymentErrorBody]`
- **Error**: `GetAuthorizedPaymentErrorBody` — **Case A (typed)**
- **Error arms**: `Error` [401, 403, 404] · `RawError` [500, anything unmapped]

| Type | Source |
| --- | --- |
| `PaymentAuthorization` | `paypal/models/payment_authorization.py` |
| `GetAuthorizedPaymentErrorBody` | `paypal/errors/get_authorized_payment_error.py` |
| `Error` | `paypal/models/error.py` |

### client.payments.get_captured_payment

- **Route**: `GET /v2/payments/captures/{capture_id}`
- **Auth**: `oauth2`
- **Signature**: `def get_captured_payment(capture_id: str, *, pay_pal_mock_response: str | None = None, request_options: RequestOptionsOrDict | None = None)`
  - required, positional: `capture_id`
- **Params**: `capture_id` — path · `pay_pal_mock_response` — header `PayPal-Mock-Response`
- **Returns (parsed)**: `CapturedPayment`
- **Returns (raw)**: `ApiResult[CapturedPayment, GetCapturedPaymentErrorBody]`
- **Error**: `GetCapturedPaymentErrorBody` — **Case A (typed)**
- **Error arms**: `Error` [401, 403, 404] · `RawError` [500, anything unmapped]

| Type | Source |
| --- | --- |
| `CapturedPayment` | `paypal/models/captured_payment.py` |
| `GetCapturedPaymentErrorBody` | `paypal/errors/get_captured_payment_error.py` |
| `Error` | `paypal/models/error.py` |

### client.payments.get_refund

- **Route**: `GET /v2/payments/refunds/{refund_id}`
- **Auth**: `oauth2`
- **Signature**: `def get_refund(refund_id: str, *, pay_pal_mock_response: str | None = None, pay_pal_auth_assertion: str | None = None, request_options: RequestOptionsOrDict | None = None)`
  - required, positional: `refund_id`
- **Params**: `refund_id` — path · `pay_pal_mock_response` — header `PayPal-Mock-Response` · `pay_pal_auth_assertion` — header `PayPal-Auth-Assertion`
- **Returns (parsed)**: `Refund`
- **Returns (raw)**: `ApiResult[Refund, GetRefundErrorBody]`
- **Error**: `GetRefundErrorBody` — **Case A (typed)**
- **Error arms**: `Error` [401, 403, 404] · `RawError` [500, anything unmapped]

| Type | Source |
| --- | --- |
| `Refund` | `paypal/models/refund.py` |
| `GetRefundErrorBody` | `paypal/errors/get_refund_error.py` |
| `Error` | `paypal/models/error.py` |

### client.payments.reauthorize_payment

- **Route**: `POST /v2/payments/authorizations/{authorization_id}/reauthorize`
- **Auth**: `oauth2`
- **Signature**: `def reauthorize_payment(authorization_id: str, *, pay_pal_request_id: str | None = None, prefer: str | None = "return=minimal", pay_pal_auth_assertion: str | None = None, body: ReauthorizeRequest | ReauthorizeRequestDict | None = None, request_options: RequestOptionsOrDict | None = None)`
  - required, positional: `authorization_id`
- **Params**: `authorization_id` — path · `pay_pal_request_id` — header `PayPal-Request-Id` · `prefer` — header `Prefer` · `pay_pal_auth_assertion` — header `PayPal-Auth-Assertion` · `body` — JSON body
- **Returns (parsed)**: `PaymentAuthorization`
- **Returns (raw)**: `ApiResult[PaymentAuthorization, ReauthorizePaymentErrorBody]`
- **Error**: `ReauthorizePaymentErrorBody` — **Case A (typed)**
- **Error arms**: `Error` [400, 401, 403, 404, 422] · `RawError` [500, anything unmapped]

| Type | Source |
| --- | --- |
| `ReauthorizeRequest` | `paypal/models/reauthorize_request.py` |
| `ReauthorizeRequestDict` | `paypal/models/reauthorize_request.py` |
| `PaymentAuthorization` | `paypal/models/payment_authorization.py` |
| `ReauthorizePaymentErrorBody` | `paypal/errors/reauthorize_payment_error.py` |
| `Error` | `paypal/models/error.py` |

### client.payments.refund_captured_payment

- **Route**: `POST /v2/payments/captures/{capture_id}/refund`
- **Auth**: `oauth2`
- **Signature**: `def refund_captured_payment(capture_id: str, *, pay_pal_mock_response: str | None = None, pay_pal_request_id: str | None = None, prefer: str | None = "return=minimal", pay_pal_auth_assertion: str | None = None, body: RefundRequest | RefundRequestDict | None = None, request_options: RequestOptionsOrDict | None = None)`
  - required, positional: `capture_id`
- **Params**: `capture_id` — path · `pay_pal_mock_response` — header `PayPal-Mock-Response` · `pay_pal_request_id` — header `PayPal-Request-Id` · `prefer` — header `Prefer` · `pay_pal_auth_assertion` — header `PayPal-Auth-Assertion` · `body` — JSON body
- **Returns (parsed)**: `Refund`
- **Returns (raw)**: `ApiResult[Refund, RefundCapturedPaymentErrorBody]`
- **Error**: `RefundCapturedPaymentErrorBody` — **Case A (typed)**
- **Error arms**: `Error` [400, 401, 403, 404, 409, 422] · `RawError` [500, anything unmapped]

| Type | Source |
| --- | --- |
| `RefundRequest` | `paypal/models/refund_request.py` |
| `RefundRequestDict` | `paypal/models/refund_request.py` |
| `Refund` | `paypal/models/refund.py` |
| `RefundCapturedPaymentErrorBody` | `paypal/errors/refund_captured_payment_error.py` |
| `Error` | `paypal/models/error.py` |

### client.payments.void_payment

- **Route**: `POST /v2/payments/authorizations/{authorization_id}/void`
- **Auth**: `oauth2`
- **Signature**: `def void_payment(authorization_id: str, *, pay_pal_mock_response: str | None = None, pay_pal_auth_assertion: str | None = None, pay_pal_request_id: str | None = None, prefer: str | None = "return=minimal", request_options: RequestOptionsOrDict | None = None)`
  - required, positional: `authorization_id`
- **Params**: `authorization_id` — path · `pay_pal_mock_response` — header `PayPal-Mock-Response` · `pay_pal_auth_assertion` — header `PayPal-Auth-Assertion` · `pay_pal_request_id` — header `PayPal-Request-Id` · `prefer` — header `Prefer`
- **Returns (parsed)**: `PaymentAuthorization`
- **Returns (raw)**: `ApiResult[PaymentAuthorization, VoidPaymentErrorBody]`
- **Error**: `VoidPaymentErrorBody` — **Case A (typed)**
- **Error arms**: `Error` [401, 403, 404, 409, 422] · `RawError` [500, anything unmapped]

| Type | Source |
| --- | --- |
| `PaymentAuthorization` | `paypal/models/payment_authorization.py` |
| `VoidPaymentErrorBody` | `paypal/errors/void_payment_error.py` |
| `Error` | `paypal/models/error.py` |

