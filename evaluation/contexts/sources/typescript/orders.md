<!-- Generated file — do not edit; regenerated with the SDK. -->

# Orders — operations

Accessor: `client.orders` · Source: `src/resources/orders.ts` · 8 operations · Request and error types: namespace `Orders`

**Type sources**: every type an operation names, with the file that declares it and the schema value exported beside it. Import every name from `paypal`; the `Source` path is where to **read** the shape, never what to import. `ApiError`, the runtime error family and the file vocabulary are excluded — see sdk-map.md.

### authorizeOrder

- **Signature**: `authorizeOrder(request: Orders.AuthorizeOrderRequest, options?: RequestOptions): ApiPromise<OrderAuthorizeResponse, Orders.AuthorizeOrderError>`
- **Wire**: `POST /v2/checkout/orders/{id}/authorize`
- **Auth**: `oauth2`
- **Request body**: `application/json` — the `body` field. **Optional**: omit it and the request carries no body and no `Content-Type` header at all
- **SDK-sent**: `header Idempotency-Key` (minted per call)
- **Returns**: `OrderAuthorizeResponse`
- **Error**: `PaypalError` with `kind: "api"`, an instance of `Orders.AuthorizeOrderError` — **typed arms**, narrowed on `err.payload.kind`
- **Error arms**: `"error"` [400] `Error` · `"error2"` [401] `Error` · `"error3"` [403] `Error` · `"error4"` [404] `Error` · `"error5"` [422] `Error` · `"error6"` [500] `Error` · `"error7"` [default — any status no arm above covers] `Error` · `"undeclared"` [a `default`-matched body that did not fit `Error`] `rawBody: ArrayBuffer`

**Fields** — `Orders.AuthorizeOrderRequest` (7):

| Field | Channel | Wire | Type | Req | Default |
| --- | --- | --- | --- | --- | --- |
| `id` | `path` | — | `string` | yes | — |
| `payPalMockResponse` | `header` | `PayPal-Mock-Response` | `string` | no | — |
| `payPalRequestId` | `header` | `PayPal-Request-Id` | `string` | no | — |
| `prefer` | `header` | `Prefer` | `string` | no | `"return=minimal"` |
| `payPalClientMetadataId` | `header` | `PayPal-Client-Metadata-Id` | `string` | no | — |
| `payPalAuthAssertion` | `header` | `PayPal-Auth-Assertion` | `string` | no | — |
| `body` | `body` | — | `OrderAuthorizeRequest` | no | — |

| Type | Schema value | Source |
| --- | --- | --- |
| `OrderAuthorizeRequest` | `orderAuthorizeRequestSchema` | `src/models/order-authorize-request.ts` |
| `OrderAuthorizeResponse` | `orderAuthorizeResponseSchema` | `src/models/order-authorize-response.ts` |
| `Error` | `errorSchema` | `src/models/error.ts` |

### captureOrder

- **Signature**: `captureOrder(request: Orders.CaptureOrderRequest, options?: RequestOptions): ApiPromise<Order, Orders.CaptureOrderError>`
- **Wire**: `POST /v2/checkout/orders/{id}/capture`
- **Auth**: `oauth2`
- **Request body**: `application/json` — the `body` field. **Optional**: omit it and the request carries no body and no `Content-Type` header at all
- **SDK-sent**: `header Idempotency-Key` (minted per call)
- **Returns**: `Order`
- **Error**: `PaypalError` with `kind: "api"`, an instance of `Orders.CaptureOrderError` — **typed arms**, narrowed on `err.payload.kind`
- **Error arms**: `"error"` [400] `Error` · `"error2"` [401] `Error` · `"error3"` [403] `Error` · `"error4"` [404] `Error` · `"error5"` [422] `Error` · `"error6"` [500] `Error` · `"error7"` [default — any status no arm above covers] `Error` · `"undeclared"` [a `default`-matched body that did not fit `Error`] `rawBody: ArrayBuffer`

**Fields** — `Orders.CaptureOrderRequest` (7):

| Field | Channel | Wire | Type | Req | Default |
| --- | --- | --- | --- | --- | --- |
| `id` | `path` | — | `string` | yes | — |
| `payPalMockResponse` | `header` | `PayPal-Mock-Response` | `string` | no | — |
| `payPalRequestId` | `header` | `PayPal-Request-Id` | `string` | no | — |
| `prefer` | `header` | `Prefer` | `string` | no | `"return=minimal"` |
| `payPalClientMetadataId` | `header` | `PayPal-Client-Metadata-Id` | `string` | no | — |
| `payPalAuthAssertion` | `header` | `PayPal-Auth-Assertion` | `string` | no | — |
| `body` | `body` | — | `OrderCaptureRequest` | no | — |

| Type | Schema value | Source |
| --- | --- | --- |
| `OrderCaptureRequest` | `orderCaptureRequestSchema` | `src/models/order-capture-request.ts` |
| `Order` | `orderSchema` | `src/models/order.ts` |
| `Error` | `errorSchema` | `src/models/error.ts` |

### confirmOrder

- **Signature**: `confirmOrder(request: Orders.ConfirmOrderRequestParams, options?: RequestOptions): ApiPromise<Order, Orders.ConfirmOrderError>`
- **Wire**: `POST /v2/checkout/orders/{id}/confirm-payment-source`
- **Auth**: `oauth2`
- **Request body**: `application/json` — the `body` field. **Optional**: omit it and the request carries no body and no `Content-Type` header at all
- **SDK-sent**: `header Idempotency-Key` (minted per call)
- **Returns**: `Order`
- **Error**: `PaypalError` with `kind: "api"`, an instance of `Orders.ConfirmOrderError` — **typed arms**, narrowed on `err.payload.kind`
- **Error arms**: `"error"` [400] `Error` · `"error2"` [403] `Error` · `"error3"` [422] `Error` · `"error4"` [500] `Error` · `"error5"` [default — any status no arm above covers] `Error` · `"undeclared"` [a `default`-matched body that did not fit `Error`] `rawBody: ArrayBuffer`

**Fields** — `Orders.ConfirmOrderRequestParams` (5):

| Field | Channel | Wire | Type | Req | Default |
| --- | --- | --- | --- | --- | --- |
| `id` | `path` | — | `string` | yes | — |
| `payPalClientMetadataId` | `header` | `PayPal-Client-Metadata-Id` | `string` | no | — |
| `payPalAuthAssertion` | `header` | `PayPal-Auth-Assertion` | `string` | no | — |
| `prefer` | `header` | `Prefer` | `string` | no | `"return=minimal"` |
| `body` | `body` | — | `ConfirmOrderRequest` | no | — |

| Type | Schema value | Source |
| --- | --- | --- |
| `ConfirmOrderRequest` | `confirmOrderRequestSchema` | `src/models/confirm-order-request.ts` |
| `Order` | `orderSchema` | `src/models/order.ts` |
| `Error` | `errorSchema` | `src/models/error.ts` |

### createOrder

- **Signature**: `createOrder(request: Orders.CreateOrderRequest, options?: RequestOptions): ApiPromise<Order, Orders.CreateOrderError>`
- **Wire**: `POST /v2/checkout/orders`
- **Auth**: `oauth2`
- **Request body**: `application/json` — the `body` field
- **SDK-sent**: `header Idempotency-Key` (minted per call)
- **Returns**: `Order`
- **Error**: `PaypalError` with `kind: "api"`, an instance of `Orders.CreateOrderError` — **typed arms**, narrowed on `err.payload.kind`
- **Error arms**: `"error"` [400] `Error` · `"error2"` [401] `Error` · `"error3"` [422] `Error` · `"error4"` [default — any status no arm above covers] `Error` · `"undeclared"` [a `default`-matched body that did not fit `Error`] `rawBody: ArrayBuffer`

**Fields** — `Orders.CreateOrderRequest` (7):

| Field | Channel | Wire | Type | Req | Default |
| --- | --- | --- | --- | --- | --- |
| `payPalMockResponse` | `header` | `PayPal-Mock-Response` | `string` | no | — |
| `payPalRequestId` | `header` | `PayPal-Request-Id` | `string` | no | — |
| `payPalPartnerAttributionId` | `header` | `PayPal-Partner-Attribution-Id` | `string` | no | — |
| `payPalClientMetadataId` | `header` | `PayPal-Client-Metadata-Id` | `string` | no | — |
| `prefer` | `header` | `Prefer` | `string` | no | `"return=minimal"` |
| `payPalAuthAssertion` | `header` | `PayPal-Auth-Assertion` | `string` | no | — |
| `body` | `body` | — | `OrderRequest` | yes | — |

| Type | Schema value | Source |
| --- | --- | --- |
| `OrderRequest` | `orderRequestSchema` | `src/models/order-request.ts` |
| `Order` | `orderSchema` | `src/models/order.ts` |
| `Error` | `errorSchema` | `src/models/error.ts` |

### createOrderTracking

- **Signature**: `createOrderTracking(request: Orders.CreateOrderTrackingRequest, options?: RequestOptions): ApiPromise<Order, Orders.CreateOrderTrackingError>`
- **Wire**: `POST /v2/checkout/orders/{id}/track`
- **Auth**: `oauth2`
- **Request body**: `application/json` — the `body` field
- **SDK-sent**: `header Idempotency-Key` (minted per call)
- **Returns**: `Order`
- **Error**: `PaypalError` with `kind: "api"`, an instance of `Orders.CreateOrderTrackingError` — **typed arms**, narrowed on `err.payload.kind`
- **Error arms**: `"error"` [400] `Error` · `"error2"` [403] `Error` · `"error3"` [404] `Error` · `"error4"` [422] `Error` · `"error5"` [500] `Error` · `"error6"` [default — any status no arm above covers] `Error` · `"undeclared"` [a `default`-matched body that did not fit `Error`] `rawBody: ArrayBuffer`

**Fields** — `Orders.CreateOrderTrackingRequest` (3):

| Field | Channel | Wire | Type | Req |
| --- | --- | --- | --- | --- |
| `id` | `path` | — | `string` | yes |
| `payPalAuthAssertion` | `header` | `PayPal-Auth-Assertion` | `string` | no |
| `body` | `body` | — | `OrderTrackerRequest` | yes |

| Type | Schema value | Source |
| --- | --- | --- |
| `OrderTrackerRequest` | `orderTrackerRequestSchema` | `src/models/order-tracker-request.ts` |
| `Order` | `orderSchema` | `src/models/order.ts` |
| `Error` | `errorSchema` | `src/models/error.ts` |

### getOrder

- **Signature**: `getOrder(request: Orders.GetOrderRequest, options?: RequestOptions): ApiPromise<Order, Orders.GetOrderError>`
- **Wire**: `GET /v2/checkout/orders/{id}`
- **Auth**: `oauth2`
- **Request body**: none — no `Content-Type` header is sent
- **Returns**: `Order`
- **Error**: `PaypalError` with `kind: "api"`, an instance of `Orders.GetOrderError` — **typed arms**, narrowed on `err.payload.kind`
- **Error arms**: `"error"` [401] `Error` · `"error2"` [404] `Error` · `"error3"` [default — any status no arm above covers] `Error` · `"undeclared"` [a `default`-matched body that did not fit `Error`] `rawBody: ArrayBuffer`

**Fields** — `Orders.GetOrderRequest` (4):

| Field | Channel | Wire | Type | Req |
| --- | --- | --- | --- | --- |
| `id` | `path` | — | `string` | yes |
| `fields` | `query` | — | `string` | no |
| `payPalMockResponse` | `header` | `PayPal-Mock-Response` | `string` | no |
| `payPalAuthAssertion` | `header` | `PayPal-Auth-Assertion` | `string` | no |

| Type | Schema value | Source |
| --- | --- | --- |
| `Order` | `orderSchema` | `src/models/order.ts` |
| `Error` | `errorSchema` | `src/models/error.ts` |

### patchOrder

- **Signature**: `patchOrder(request: Orders.PatchOrderRequest, options?: RequestOptions): ApiPromise<undefined, Orders.PatchOrderError>`
- **Wire**: `PATCH /v2/checkout/orders/{id}`
- **Auth**: `oauth2`
- **Request body**: `application/json` — the `body` field, a bare top-level JSON array. **Optional**: omit it and the request carries no body and no `Content-Type` header at all
- **SDK-sent**: `header Idempotency-Key` (minted per call)
- **Returns**: `undefined` — the operation resolves to nothing
- **Error**: `PaypalError` with `kind: "api"`, an instance of `Orders.PatchOrderError` — **typed arms**, narrowed on `err.payload.kind`
- **Error arms**: `"error"` [400] `Error` · `"error2"` [401] `Error` · `"error3"` [404] `Error` · `"error4"` [422] `Error` · `"error5"` [default — any status no arm above covers] `Error` · `"undeclared"` [a `default`-matched body that did not fit `Error`] `rawBody: ArrayBuffer`

**Fields** — `Orders.PatchOrderRequest` (4):

| Field | Channel | Wire | Type | Req |
| --- | --- | --- | --- | --- |
| `id` | `path` | — | `string` | yes |
| `payPalMockResponse` | `header` | `PayPal-Mock-Response` | `string` | no |
| `payPalAuthAssertion` | `header` | `PayPal-Auth-Assertion` | `string` | no |
| `body` | `body` | — | `Patch[]` | no |

| Type | Schema value | Source |
| --- | --- | --- |
| `Patch` | `patchSchema` | `src/models/patch.ts` |
| `Error` | `errorSchema` | `src/models/error.ts` |

### updateOrderTracking

- **Signature**: `updateOrderTracking(request: Orders.UpdateOrderTrackingRequest, options?: RequestOptions): ApiPromise<undefined, Orders.UpdateOrderTrackingError>`
- **Wire**: `PATCH /v2/checkout/orders/{id}/trackers/{tracker_id}`
- **Auth**: `oauth2`
- **Request body**: `application/json` — the `body` field, a bare top-level JSON array. **Optional**: omit it and the request carries no body and no `Content-Type` header at all
- **SDK-sent**: `header Idempotency-Key` (minted per call)
- **Returns**: `undefined` — the operation resolves to nothing
- **Error**: `PaypalError` with `kind: "api"`, an instance of `Orders.UpdateOrderTrackingError` — **typed arms**, narrowed on `err.payload.kind`
- **Error arms**: `"error"` [400] `Error` · `"error2"` [403] `Error` · `"error3"` [404] `Error` · `"error4"` [422] `Error` · `"error5"` [500] `Error` · `"error6"` [default — any status no arm above covers] `Error` · `"undeclared"` [a `default`-matched body that did not fit `Error`] `rawBody: ArrayBuffer`

**Fields** — `Orders.UpdateOrderTrackingRequest` (4):

| Field | Channel | Wire | Type | Req |
| --- | --- | --- | --- | --- |
| `id` | `path` | — | `string` | yes |
| `trackerId` | `path` | `tracker_id` | `string` | yes |
| `payPalAuthAssertion` | `header` | `PayPal-Auth-Assertion` | `string` | no |
| `body` | `body` | — | `Patch[]` | no |

| Type | Schema value | Source |
| --- | --- | --- |
| `Patch` | `patchSchema` | `src/models/patch.ts` |
| `Error` | `errorSchema` | `src/models/error.ts` |

