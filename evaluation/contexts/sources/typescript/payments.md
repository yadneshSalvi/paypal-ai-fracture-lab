<!-- Generated file — do not edit; regenerated with the SDK. -->

# Payments — operations

Accessor: `client.payments` · Source: `src/resources/payments.ts` · 7 operations · Request and error types: namespace `Payments`

**Type sources**: every type an operation names, with the file that declares it and the schema value exported beside it. Import every name from `paypal`; the `Source` path is where to **read** the shape, never what to import. `ApiError`, the runtime error family and the file vocabulary are excluded — see sdk-map.md.

### captureAuthorizedPayment

- **Signature**: `captureAuthorizedPayment(request: Payments.CaptureAuthorizedPaymentRequest, options?: RequestOptions): ApiPromise<CapturedPayment, Payments.CaptureAuthorizedPaymentError>`
- **Wire**: `POST /v2/payments/authorizations/{authorization_id}/capture`
- **Auth**: `oauth2`
- **Request body**: `application/json` — the `body` field. **Optional**: omit it and the request carries no body and no `Content-Type` header at all
- **SDK-sent**: `header Idempotency-Key` (minted per call)
- **Returns**: `CapturedPayment`
- **Error**: `PaypalError` with `kind: "api"`, an instance of `Payments.CaptureAuthorizedPaymentError` — **typed arms**, narrowed on `err.payload.kind`
- **Error arms**: `"error"` [400] `Error` · `"error2"` [401] `Error` · `"error3"` [403] `Error` · `"error4"` [404] `Error` · `"error5"` [409] `Error` · `"error6"` [422] `Error` · `"error500"` [500] no body · `"error7"` [default — any status no arm above covers] `Error` · `"undeclared"` [a `default`-matched body that did not fit `Error`] `rawBody: ArrayBuffer`

**Fields** — `Payments.CaptureAuthorizedPaymentRequest` (6):

| Field | Channel | Wire | Type | Req | Default |
| --- | --- | --- | --- | --- | --- |
| `authorizationId` | `path` | `authorization_id` | `string` | yes | — |
| `payPalMockResponse` | `header` | `PayPal-Mock-Response` | `string` | no | — |
| `payPalRequestId` | `header` | `PayPal-Request-Id` | `string` | no | — |
| `prefer` | `header` | `Prefer` | `string` | no | `"return=minimal"` |
| `payPalAuthAssertion` | `header` | `PayPal-Auth-Assertion` | `string` | no | — |
| `body` | `body` | — | `CaptureRequest` | no | — |

| Type | Schema value | Source |
| --- | --- | --- |
| `CaptureRequest` | `captureRequestSchema` | `src/models/capture-request.ts` |
| `CapturedPayment` | `capturedPaymentSchema` | `src/models/captured-payment.ts` |
| `Error` | `errorSchema` | `src/models/error.ts` |

### getAuthorizedPayment

- **Signature**: `getAuthorizedPayment(request: Payments.GetAuthorizedPaymentRequest, options?: RequestOptions): ApiPromise<PaymentAuthorization, Payments.GetAuthorizedPaymentError>`
- **Wire**: `GET /v2/payments/authorizations/{authorization_id}`
- **Auth**: `oauth2`
- **Request body**: none — no `Content-Type` header is sent
- **Returns**: `PaymentAuthorization`
- **Error**: `PaypalError` with `kind: "api"`, an instance of `Payments.GetAuthorizedPaymentError` — **typed arms**, narrowed on `err.payload.kind`
- **Error arms**: `"error"` [401] `Error` · `"error2"` [403] `Error` · `"error3"` [404] `Error` · `"error500"` [500] no body · `"error4"` [default — any status no arm above covers] `Error` · `"undeclared"` [a `default`-matched body that did not fit `Error`] `rawBody: ArrayBuffer`

**Fields** — `Payments.GetAuthorizedPaymentRequest` (3):

| Field | Channel | Wire | Type | Req |
| --- | --- | --- | --- | --- |
| `authorizationId` | `path` | `authorization_id` | `string` | yes |
| `payPalMockResponse` | `header` | `PayPal-Mock-Response` | `string` | no |
| `payPalAuthAssertion` | `header` | `PayPal-Auth-Assertion` | `string` | no |

| Type | Schema value | Source |
| --- | --- | --- |
| `PaymentAuthorization` | `paymentAuthorizationSchema` | `src/models/payment-authorization.ts` |
| `Error` | `errorSchema` | `src/models/error.ts` |

### getCapturedPayment

- **Signature**: `getCapturedPayment(request: Payments.GetCapturedPaymentRequest, options?: RequestOptions): ApiPromise<CapturedPayment, Payments.GetCapturedPaymentError>`
- **Wire**: `GET /v2/payments/captures/{capture_id}`
- **Auth**: `oauth2`
- **Request body**: none — no `Content-Type` header is sent
- **Returns**: `CapturedPayment`
- **Error**: `PaypalError` with `kind: "api"`, an instance of `Payments.GetCapturedPaymentError` — **typed arms**, narrowed on `err.payload.kind`
- **Error arms**: `"error"` [401] `Error` · `"error2"` [403] `Error` · `"error3"` [404] `Error` · `"error500"` [500] no body · `"error4"` [default — any status no arm above covers] `Error` · `"undeclared"` [a `default`-matched body that did not fit `Error`] `rawBody: ArrayBuffer`

**Fields** — `Payments.GetCapturedPaymentRequest` (2):

| Field | Channel | Wire | Type | Req |
| --- | --- | --- | --- | --- |
| `captureId` | `path` | `capture_id` | `string` | yes |
| `payPalMockResponse` | `header` | `PayPal-Mock-Response` | `string` | no |

| Type | Schema value | Source |
| --- | --- | --- |
| `CapturedPayment` | `capturedPaymentSchema` | `src/models/captured-payment.ts` |
| `Error` | `errorSchema` | `src/models/error.ts` |

### getRefund

- **Signature**: `getRefund(request: Payments.GetRefundRequest, options?: RequestOptions): ApiPromise<Refund, Payments.GetRefundError>`
- **Wire**: `GET /v2/payments/refunds/{refund_id}`
- **Auth**: `oauth2`
- **Request body**: none — no `Content-Type` header is sent
- **Returns**: `Refund`
- **Error**: `PaypalError` with `kind: "api"`, an instance of `Payments.GetRefundError` — **typed arms**, narrowed on `err.payload.kind`
- **Error arms**: `"error"` [401] `Error` · `"error2"` [403] `Error` · `"error3"` [404] `Error` · `"error500"` [500] no body · `"error4"` [default — any status no arm above covers] `Error` · `"undeclared"` [a `default`-matched body that did not fit `Error`] `rawBody: ArrayBuffer`

**Fields** — `Payments.GetRefundRequest` (3):

| Field | Channel | Wire | Type | Req |
| --- | --- | --- | --- | --- |
| `refundId` | `path` | `refund_id` | `string` | yes |
| `payPalMockResponse` | `header` | `PayPal-Mock-Response` | `string` | no |
| `payPalAuthAssertion` | `header` | `PayPal-Auth-Assertion` | `string` | no |

| Type | Schema value | Source |
| --- | --- | --- |
| `Refund` | `refundSchema` | `src/models/refund.ts` |
| `Error` | `errorSchema` | `src/models/error.ts` |

### reauthorizePayment

- **Signature**: `reauthorizePayment(request: Payments.ReauthorizePaymentRequest, options?: RequestOptions): ApiPromise<PaymentAuthorization, Payments.ReauthorizePaymentError>`
- **Wire**: `POST /v2/payments/authorizations/{authorization_id}/reauthorize`
- **Auth**: `oauth2`
- **Request body**: `application/json` — the `body` field. **Optional**: omit it and the request carries no body and no `Content-Type` header at all
- **SDK-sent**: `header Idempotency-Key` (minted per call)
- **Returns**: `PaymentAuthorization`
- **Error**: `PaypalError` with `kind: "api"`, an instance of `Payments.ReauthorizePaymentError` — **typed arms**, narrowed on `err.payload.kind`
- **Error arms**: `"error"` [400] `Error` · `"error2"` [401] `Error` · `"error3"` [403] `Error` · `"error4"` [404] `Error` · `"error5"` [422] `Error` · `"error500"` [500] no body · `"error6"` [default — any status no arm above covers] `Error` · `"undeclared"` [a `default`-matched body that did not fit `Error`] `rawBody: ArrayBuffer`

**Fields** — `Payments.ReauthorizePaymentRequest` (5):

| Field | Channel | Wire | Type | Req | Default |
| --- | --- | --- | --- | --- | --- |
| `authorizationId` | `path` | `authorization_id` | `string` | yes | — |
| `payPalRequestId` | `header` | `PayPal-Request-Id` | `string` | no | — |
| `prefer` | `header` | `Prefer` | `string` | no | `"return=minimal"` |
| `payPalAuthAssertion` | `header` | `PayPal-Auth-Assertion` | `string` | no | — |
| `body` | `body` | — | `ReauthorizeRequest` | no | — |

| Type | Schema value | Source |
| --- | --- | --- |
| `ReauthorizeRequest` | `reauthorizeRequestSchema` | `src/models/reauthorize-request.ts` |
| `PaymentAuthorization` | `paymentAuthorizationSchema` | `src/models/payment-authorization.ts` |
| `Error` | `errorSchema` | `src/models/error.ts` |

### refundCapturedPayment

- **Signature**: `refundCapturedPayment(request: Payments.RefundCapturedPaymentRequest, options?: RequestOptions): ApiPromise<Refund, Payments.RefundCapturedPaymentError>`
- **Wire**: `POST /v2/payments/captures/{capture_id}/refund`
- **Auth**: `oauth2`
- **Request body**: `application/json` — the `body` field. **Optional**: omit it and the request carries no body and no `Content-Type` header at all
- **SDK-sent**: `header Idempotency-Key` (minted per call)
- **Returns**: `Refund`
- **Error**: `PaypalError` with `kind: "api"`, an instance of `Payments.RefundCapturedPaymentError` — **typed arms**, narrowed on `err.payload.kind`
- **Error arms**: `"error"` [400] `Error` · `"error2"` [401] `Error` · `"error3"` [403] `Error` · `"error4"` [404] `Error` · `"error5"` [409] `Error` · `"error6"` [422] `Error` · `"error500"` [500] no body · `"error7"` [default — any status no arm above covers] `Error` · `"undeclared"` [a `default`-matched body that did not fit `Error`] `rawBody: ArrayBuffer`

**Fields** — `Payments.RefundCapturedPaymentRequest` (6):

| Field | Channel | Wire | Type | Req | Default |
| --- | --- | --- | --- | --- | --- |
| `captureId` | `path` | `capture_id` | `string` | yes | — |
| `payPalMockResponse` | `header` | `PayPal-Mock-Response` | `string` | no | — |
| `payPalRequestId` | `header` | `PayPal-Request-Id` | `string` | no | — |
| `prefer` | `header` | `Prefer` | `string` | no | `"return=minimal"` |
| `payPalAuthAssertion` | `header` | `PayPal-Auth-Assertion` | `string` | no | — |
| `body` | `body` | — | `RefundRequest` | no | — |

| Type | Schema value | Source |
| --- | --- | --- |
| `RefundRequest` | `refundRequestSchema` | `src/models/refund-request.ts` |
| `Refund` | `refundSchema` | `src/models/refund.ts` |
| `Error` | `errorSchema` | `src/models/error.ts` |

### voidPayment

- **Signature**: `voidPayment(request: Payments.VoidPaymentRequest, options?: RequestOptions): ApiPromise<PaymentAuthorization, Payments.VoidPaymentError>`
- **Wire**: `POST /v2/payments/authorizations/{authorization_id}/void`
- **Auth**: `oauth2`
- **Request body**: none — no `Content-Type` header is sent
- **SDK-sent**: `header Idempotency-Key` (minted per call)
- **Returns**: `PaymentAuthorization`
- **Error**: `PaypalError` with `kind: "api"`, an instance of `Payments.VoidPaymentError` — **typed arms**, narrowed on `err.payload.kind`
- **Error arms**: `"error"` [401] `Error` · `"error2"` [403] `Error` · `"error3"` [404] `Error` · `"error4"` [409] `Error` · `"error5"` [422] `Error` · `"error500"` [500] no body · `"error6"` [default — any status no arm above covers] `Error` · `"undeclared"` [a `default`-matched body that did not fit `Error`] `rawBody: ArrayBuffer`

**Fields** — `Payments.VoidPaymentRequest` (5):

| Field | Channel | Wire | Type | Req | Default |
| --- | --- | --- | --- | --- | --- |
| `authorizationId` | `path` | `authorization_id` | `string` | yes | — |
| `payPalMockResponse` | `header` | `PayPal-Mock-Response` | `string` | no | — |
| `payPalAuthAssertion` | `header` | `PayPal-Auth-Assertion` | `string` | no | — |
| `payPalRequestId` | `header` | `PayPal-Request-Id` | `string` | no | — |
| `prefer` | `header` | `Prefer` | `string` | no | `"return=minimal"` |

| Type | Schema value | Source |
| --- | --- | --- |
| `PaymentAuthorization` | `paymentAuthorizationSchema` | `src/models/payment-authorization.ts` |
| `Error` | `errorSchema` | `src/models/error.ts` |

