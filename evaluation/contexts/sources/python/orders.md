<!-- Generated file — do not edit; regenerated with the SDK. -->

# Orders — operations

Accessor: `client.orders` · Source: `paypal/apis/orders.py` · 8 operations

Each `###` block is one operation and assumes `sdk-map.md` is loaded: blocks omit what its invariants table covers and are otherwise self-contained, so chunk at block level. Signatures are the sync parsed spelling; the async and raw spellings take the same parameters (see sdk-map.md). **Type sources** names the module declaring each type an operation mentions, so resolving a body, return or error payload is a lookup rather than a search; the runtime types `RawError` and `ApiResult` are excluded.

### client.orders.authorize_order

- **Route**: `POST /v2/checkout/orders/{id}/authorize`
- **Auth**: `oauth2`
- **Signature**: `def authorize_order(id_: str, *, pay_pal_mock_response: str | None = None, pay_pal_request_id: str | None = None, prefer: str | None = "return=minimal", pay_pal_client_metadata_id: str | None = None, pay_pal_auth_assertion: str | None = None, body: OrderAuthorizeRequest | OrderAuthorizeRequestDict | None = None, request_options: RequestOptionsOrDict | None = None)`
  - required, positional: `id_`
- **Params**: `id_` — path `id` · `pay_pal_mock_response` — header `PayPal-Mock-Response` · `pay_pal_request_id` — header `PayPal-Request-Id` · `prefer` — header `Prefer` · `pay_pal_client_metadata_id` — header `PayPal-Client-Metadata-Id` · `pay_pal_auth_assertion` — header `PayPal-Auth-Assertion` · `body` — JSON body
- **Returns (parsed)**: `OrderAuthorizeResponse`
- **Returns (raw)**: `ApiResult[OrderAuthorizeResponse, AuthorizeOrderErrorBody]`
- **Error**: `AuthorizeOrderErrorBody` — **Case A (typed)**
- **Error arms**: `Error` [400, 401, 403, 404, 422, 500] · `RawError` [anything unmapped]

| Type | Source |
| --- | --- |
| `OrderAuthorizeRequest` | `paypal/models/order_authorize_request.py` |
| `OrderAuthorizeRequestDict` | `paypal/models/order_authorize_request.py` |
| `OrderAuthorizeResponse` | `paypal/models/order_authorize_response.py` |
| `AuthorizeOrderErrorBody` | `paypal/errors/authorize_order_error.py` |
| `Error` | `paypal/models/error.py` |

### client.orders.capture_order

- **Route**: `POST /v2/checkout/orders/{id}/capture`
- **Auth**: `oauth2`
- **Signature**: `def capture_order(id_: str, *, pay_pal_mock_response: str | None = None, pay_pal_request_id: str | None = None, prefer: str | None = "return=minimal", pay_pal_client_metadata_id: str | None = None, pay_pal_auth_assertion: str | None = None, body: OrderCaptureRequest | OrderCaptureRequestDict | None = None, request_options: RequestOptionsOrDict | None = None)`
  - required, positional: `id_`
- **Params**: `id_` — path `id` · `pay_pal_mock_response` — header `PayPal-Mock-Response` · `pay_pal_request_id` — header `PayPal-Request-Id` · `prefer` — header `Prefer` · `pay_pal_client_metadata_id` — header `PayPal-Client-Metadata-Id` · `pay_pal_auth_assertion` — header `PayPal-Auth-Assertion` · `body` — JSON body
- **Returns (parsed)**: `Order`
- **Returns (raw)**: `ApiResult[Order, CaptureOrderErrorBody]`
- **Error**: `CaptureOrderErrorBody` — **Case A (typed)**
- **Error arms**: `Error` [400, 401, 403, 404, 422, 500] · `RawError` [anything unmapped]

| Type | Source |
| --- | --- |
| `OrderCaptureRequest` | `paypal/models/order_capture_request.py` |
| `OrderCaptureRequestDict` | `paypal/models/order_capture_request.py` |
| `Order` | `paypal/models/order.py` |
| `CaptureOrderErrorBody` | `paypal/errors/capture_order_error.py` |
| `Error` | `paypal/models/error.py` |

### client.orders.confirm_order

- **Route**: `POST /v2/checkout/orders/{id}/confirm-payment-source`
- **Auth**: `oauth2`
- **Signature**: `def confirm_order(id_: str, *, pay_pal_client_metadata_id: str | None = None, pay_pal_auth_assertion: str | None = None, prefer: str | None = "return=minimal", body: ConfirmOrderRequest | ConfirmOrderRequestDict | None = None, request_options: RequestOptionsOrDict | None = None)`
  - required, positional: `id_`
- **Params**: `id_` — path `id` · `pay_pal_client_metadata_id` — header `PayPal-Client-Metadata-Id` · `pay_pal_auth_assertion` — header `PayPal-Auth-Assertion` · `prefer` — header `Prefer` · `body` — JSON body
- **Returns (parsed)**: `Order`
- **Returns (raw)**: `ApiResult[Order, ConfirmOrderErrorBody]`
- **Error**: `ConfirmOrderErrorBody` — **Case A (typed)**
- **Error arms**: `Error` [400, 403, 422, 500] · `RawError` [anything unmapped]

| Type | Source |
| --- | --- |
| `ConfirmOrderRequest` | `paypal/models/confirm_order_request.py` |
| `ConfirmOrderRequestDict` | `paypal/models/confirm_order_request.py` |
| `Order` | `paypal/models/order.py` |
| `ConfirmOrderErrorBody` | `paypal/errors/confirm_order_error.py` |
| `Error` | `paypal/models/error.py` |

### client.orders.create_order

- **Route**: `POST /v2/checkout/orders`
- **Auth**: `oauth2`
- **Signature**: `def create_order(body: OrderRequest | OrderRequestDict, *, pay_pal_mock_response: str | None = None, pay_pal_request_id: str | None = None, pay_pal_partner_attribution_id: str | None = None, pay_pal_client_metadata_id: str | None = None, prefer: str | None = "return=minimal", pay_pal_auth_assertion: str | None = None, request_options: RequestOptionsOrDict | None = None)`
  - required, positional: `body`
- **Params**: `pay_pal_mock_response` — header `PayPal-Mock-Response` · `pay_pal_request_id` — header `PayPal-Request-Id` · `pay_pal_partner_attribution_id` — header `PayPal-Partner-Attribution-Id` · `pay_pal_client_metadata_id` — header `PayPal-Client-Metadata-Id` · `prefer` — header `Prefer` · `pay_pal_auth_assertion` — header `PayPal-Auth-Assertion` · `body` — JSON body
- **Returns (parsed)**: `Order`
- **Returns (raw)**: `ApiResult[Order, CreateOrderErrorBody]`
- **Error**: `CreateOrderErrorBody` — **Case A (typed)**
- **Error arms**: `Error` [400, 401, 422] · `RawError` [anything unmapped]

| Type | Source |
| --- | --- |
| `OrderRequest` | `paypal/models/order_request.py` |
| `OrderRequestDict` | `paypal/models/order_request.py` |
| `Order` | `paypal/models/order.py` |
| `CreateOrderErrorBody` | `paypal/errors/create_order_error.py` |
| `Error` | `paypal/models/error.py` |

### client.orders.create_order_tracking

- **Route**: `POST /v2/checkout/orders/{id}/track`
- **Auth**: `oauth2`
- **Signature**: `def create_order_tracking(id_: str, body: OrderTrackerRequest | OrderTrackerRequestDict, *, pay_pal_auth_assertion: str | None = None, request_options: RequestOptionsOrDict | None = None)`
  - required, positional: `id_`, `body`
- **Params**: `id_` — path `id` · `pay_pal_auth_assertion` — header `PayPal-Auth-Assertion` · `body` — JSON body
- **Returns (parsed)**: `Order`
- **Returns (raw)**: `ApiResult[Order, CreateOrderTrackingErrorBody]`
- **Error**: `CreateOrderTrackingErrorBody` — **Case A (typed)**
- **Error arms**: `Error` [400, 403, 404, 422, 500] · `RawError` [anything unmapped]

| Type | Source |
| --- | --- |
| `OrderTrackerRequest` | `paypal/models/order_tracker_request.py` |
| `OrderTrackerRequestDict` | `paypal/models/order_tracker_request.py` |
| `Order` | `paypal/models/order.py` |
| `CreateOrderTrackingErrorBody` | `paypal/errors/create_order_tracking_error.py` |
| `Error` | `paypal/models/error.py` |

### client.orders.get_order

- **Route**: `GET /v2/checkout/orders/{id}`
- **Auth**: `oauth2`
- **Signature**: `def get_order(id_: str, *, fields: str | None = None, pay_pal_mock_response: str | None = None, pay_pal_auth_assertion: str | None = None, request_options: RequestOptionsOrDict | None = None)`
  - required, positional: `id_`
- **Params**: `id_` — path `id` · `fields` — query · `pay_pal_mock_response` — header `PayPal-Mock-Response` · `pay_pal_auth_assertion` — header `PayPal-Auth-Assertion`
- **Returns (parsed)**: `Order`
- **Returns (raw)**: `ApiResult[Order, GetOrderErrorBody]`
- **Error**: `GetOrderErrorBody` — **Case A (typed)**
- **Error arms**: `Error` [401, 404] · `RawError` [anything unmapped]

| Type | Source |
| --- | --- |
| `Order` | `paypal/models/order.py` |
| `GetOrderErrorBody` | `paypal/errors/get_order_error.py` |
| `Error` | `paypal/models/error.py` |

### client.orders.patch_order

- **Route**: `PATCH /v2/checkout/orders/{id}`
- **Auth**: `oauth2`
- **Signature**: `def patch_order(id_: str, *, pay_pal_mock_response: str | None = None, pay_pal_auth_assertion: str | None = None, body: list[Patch | PatchDict] | None = None, request_options: RequestOptionsOrDict | None = None)`
  - required, positional: `id_`
- **Params**: `id_` — path `id` · `pay_pal_mock_response` — header `PayPal-Mock-Response` · `pay_pal_auth_assertion` — header `PayPal-Auth-Assertion` · `body` — JSON body
- **Returns (parsed)**: `None`
- **Returns (raw)**: `ApiResult[None, PatchOrderErrorBody]`
- **Error**: `PatchOrderErrorBody` — **Case A (typed)**
- **Error arms**: `Error` [400, 401, 404, 422] · `RawError` [anything unmapped]

| Type | Source |
| --- | --- |
| `Patch` | `paypal/models/patch.py` |
| `PatchDict` | `paypal/models/patch.py` |
| `PatchOrderErrorBody` | `paypal/errors/patch_order_error.py` |
| `Error` | `paypal/models/error.py` |

### client.orders.update_order_tracking

- **Route**: `PATCH /v2/checkout/orders/{id}/trackers/{tracker_id}`
- **Auth**: `oauth2`
- **Signature**: `def update_order_tracking(id_: str, tracker_id: str, *, pay_pal_auth_assertion: str | None = None, body: list[Patch | PatchDict] | None = None, request_options: RequestOptionsOrDict | None = None)`
  - required, positional: `id_`, `tracker_id`
- **Params**: `id_` — path `id` · `tracker_id` — path · `pay_pal_auth_assertion` — header `PayPal-Auth-Assertion` · `body` — JSON body
- **Returns (parsed)**: `None`
- **Returns (raw)**: `ApiResult[None, UpdateOrderTrackingErrorBody]`
- **Error**: `UpdateOrderTrackingErrorBody` — **Case A (typed)**
- **Error arms**: `Error` [400, 403, 404, 422, 500] · `RawError` [anything unmapped]

| Type | Source |
| --- | --- |
| `Patch` | `paypal/models/patch.py` |
| `PatchDict` | `paypal/models/patch.py` |
| `UpdateOrderTrackingErrorBody` | `paypal/errors/update_order_tracking_error.py` |
| `Error` | `paypal/models/error.py` |

