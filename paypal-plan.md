# Fracture Lab PayPal integration contract

## v0.2 extension contract — checkout experience and saved wallets

Root integration owner, 11 November 2026. User authorization for full implementation persists; this is the prerequisite contract sheet, not a request for another approval. Existing operation identity, current policy, unknown-outcome recovery and no automatic write retry rules remain mandatory.

SDK lookup: installed `paypal` 2.29.0 at pinned commit above; `orders.createOrder` accepts `OrderRequest.paymentSource`, whose `paypal` member is `PayPalWallet`. Inspected `src/models/payment-source.ts`, `pay-pal-wallet.ts`, `pay-pal-wallet-experience-context.ts`, `pay-pal-wallet-stored-credential.ts`, `payment-initiator.ts`, `usage-pattern.ts`, `stored-payment-source-usage-type.ts` and experience enum models. Public root type imports only. No new transport or guessed endpoint.

- `create_order.experience` optionally carries mandatory returnUrl/cancelUrl, userAction, shippingPreference; optional brandName/locale/landingPage. It maps only to `payment_source.paypal.experience_context`; deprecated application_context is omitted. Redirects must be HTTPS, or explicit localhost/loopback HTTP for development, without credentials/fragments, and their origins must appear in the **current** policy decision's `checkoutOrigins`. Brand and locale are bounded. SDK defaults when experience is included: contact_preference NO_CONTACT_INFO, landing_page NO_PREFERENCE, payment_method_preference UNRESTRICTED. The application explicitly chooses shipping and user action.
- `create_order.savedWallet` carries vaultId, consentId/version/digest, paymentInitiator, usagePattern and usage (DERIVED or SUBSEQUENT). It maps vaultId to `payment_source.paypal.vault_id` and the payment metadata to `stored_credential`. No payer email/name/address, raw card fields, billing-agreement IDs, or token-creation attributes are sent. The caller must supply a current `savedWalletConsent` policy decision matching the exact vault and consent identity/version/digest, with an unexpired timestamp and exact permitted initiator/pattern/usage. The vault ID is also a required granted resource. Revocation is represented by withholding that grant. The provider still determines payment success; a saved wallet is neither reserved money nor evidence of a capture.
- DERIVED lets PayPal determine prior-use state. SUBSEQUENT requires actual previous successful use in the owning domain's consent record; it is never inferred merely from the existence of a token. The domain owns actual setup-token/payment-token consent acquisition and its capability qualification.
- These nested fields are part of the immutable canonical action hash; changing a return URL, wallet, consent or charge metadata cannot reuse the old claim. Both initial and immediately-before-dispatch policy checks enforce the grant. Invalid URL or consent is refused before any provider request.
- Existing receipt semantics remain: create_order success proves only a created order. Supported response links are preserved; PAYER_ACTION_REQUIRED remains an order state requiring buyer action. Capture/authorization continue as separate guarded operations. Unknown create-order responses without an observed order ID remain pending; no invented request-ID search.

Verification before release: outgoing real-SDK fixture tests assert exact snake_case payload, SDK defaults and stable PayPal-Request-Id; current-origin and exact-consent denial tests assert zero provider calls; revoked consent between claim and dispatch must leave not_sent; changed nested payload must reject identity reuse. Run PostgreSQL/SQLite conformance, strict typecheck and package build. Live checkout/vault qualification remains separate and cannot be claimed from these fixture tests.

Status: bound, with locally verified v0.1 control paths. API lookups are resolved below. `docs/evidence/core-conformance.json` records executed source/test hashes, 34 passing cases on PostgreSQL and SQLite, and fixture-only SDK traffic. Authorization lifecycle and live provider facts remain separately unverified. Prepared 2026-11-11.

## Scope, conventions and prerequisites

The full product is the Fracture Lab reliability laboratory: fault scenarios, neutral target observation, hardened control, invariant evaluation, repair verification, provider facts, local CLI/MCP, evaluation protocol and evidence export. The first implementation layer resolves Orders create/get/capture/authorize, Payments authorization capture/get/void, capture get/refund and refund get, Transaction Search reads, and independently verified webhook intake. Vault/token use, tracking, disputes, Payouts, subscription operations, and provider-native negative tests remain qualification-gated extensions; no runtime call to an unbound operation is permitted. This preserves their full product scope without inventing API facts.

Greenfield repository: existing conventions are AGENTS.md and .env.example; no application/build/typecheck/test commands existed on the untouched tree. No checks were available to run before dependency installation. Package installation is the permitted gate prerequisite. Runtime Node 22.22.3, npm 10.9.8, TypeScript 5.9.3, ESM, strict + exactOptionalPropertyTypes + verbatimModuleSyntax. Planned commands: npm run typecheck, npm test, npm run build. Next 16.4.6, React 19.3.1; app at apps/web, PostgreSQL authoritative via DATABASE_URL, local SQLite only for adapter conformance. First exemplars will be packages/paypal-core/src/types.ts and packages/db/src/index.ts.

Installed SDK: package/import paypal 2.29.0, git commit 5d0df8a8817e5fdf2e2cd48e68f790ea4730aab2. Upstream HEAD matched that SHA, npm ran upstream prepare/tshy, require.resolve points to this repository node_modules/paypal/package.json, version confirmed 2.29.0. Both module dialects will receive separate smoke processes. The source map and resource maps are present. Do not deep-import. Error model must be imported as SdkError if needed; PaypalError is the actual operational error family.

## Host, auth, response and logging decisions

Deployment intent is sandbox only. PayPal adapter construction requires PAYPAL_ENVIRONMENT=sandbox, PAYPAL_API_BASE_URL=https://api-m.sandbox.paypal.com, nonempty isolated client credentials and project-isolation acknowledgement. SDK has no ServerEnvironment; set serverOptions.baseUrl explicitly. OAuth2 client credentials use oauth2:{clientId,clientSecret}; /v1/oauth2/token follows the same base URL and uses Basic auth. One long-lived client per configuration. Tokens never reach browser, evidence, prompts or ordinary logs.

Tests inject ClientOptions.fetch with dummy credentials. Local provider fixture has its own adapter and Sample provenance; it is not a proxy for real funds. Intentional faulty targets are NEVER sent through hardened PaymentCore.execute. Instrumentation records their actual request identity without adding or changing one.

All operations use .asApiResult() on the ApiPromise before chaining, retaining success status/headers. For void, whose generated map promises PaymentAuthorization but a provider can return an empty success, the boundary treats decode uncertainty conservatively and rereads authorization. Assert id/status on resources; assert amount/currency on monetary observations and child capture IDs before reporting money. Missing optional fields are unknown, not success or absence. Normalize SDK models into our own serializable types; do not persist them as wire JSON.

Set retry:{maxRetries:0,timeout:15000}; the application owns durable reconciliation, not blind write retries. One 25000 ms AbortSignal bounds a call. Default SDK policy is GET/HEAD/PUT/OPTIONS, three retries, 60000 ms per attempt; POST is not in its gate. Generic Idempotency-Key is minted per SDK call, not durable business identity or proven PayPal enforcement. Typed payPalRequestId is the stored conservative UUID. Current SDK prose documents six-hour Orders and 45-day Payments retention; provider facts keep these documentation-scoped and do not turn them into observed universal guarantees or allow blind late retries.

Set logging:{level:'off'} explicitly; never set per-call debug. This disables all SDK request/response/body/header output. Sanitize provider debug_id and allowlisted resource/correlation fields in receipts only. Preserve Request and signal in the fetch seam, exclude OAuth from public traces. No middleware/hooks/pagination/SSE exist in this SDK. Transaction Search pagination is implemented with 100-page/31-day query bounds and a total deadline, scoped to allowed resources; its documented lag makes it corroboration, never an immediate settlement oracle.

## DURABLE WRITES — DUPLICATE CLAIMS

Every write follows a committed claim, one provider call, and a durable result. Store paycore_operations has UNIQUE(tenant_id,project_id,business_key); operationId, providerRequestId and canonical payloadHash are immutable. Atomic SQL insert rejects duplicates (Postgres 23505 / SQLite SQLITE_CONSTRAINT_UNIQUE), caught by PaymentStore.claim; loser loads winner and rejects changed payload. Known refused or never-sent records may be explicitly retried using an atomic status/version transition and same identity; unknown protection is retained. Resource budgets/reservations are locked in the same claim transaction for refund/capture conflicts. The caller re-authorizes current resource access, manifest/version/expiry and exact amounts before claim.

| Write | Claim store | Rejects second | Duplicate catch | Where in code |
|---|---|---|---|---|
| create_order | paycore_operations | semantic business_key unique | PaymentStore.claim, SQL codes above | packages/paypal-core/src/store.ts:41 |
| capture_order | paycore_operations | semantic business_key unique | PaymentStore.claim | packages/paypal-core/src/store.ts:41 |
| authorize_order | paycore_operations | semantic business_key unique | PaymentStore.claim | packages/paypal-core/src/store.ts:41 |
| capture_authorization | paycore_operations + resource reservation | unique + locked remaining amount | PaymentStore.claim | packages/paypal-core/src/store.ts:28 |
| refund_capture | paycore_operations + resource reservation | unique + locked refundable amount | PaymentStore.claim | packages/paypal-core/src/store.ts:28 |
| void_authorization | paycore_operations | semantic business_key unique | PaymentStore.claim | packages/paypal-core/src/store.ts:41 |

## UNKNOWN OUTCOMES

Connection/timeout, unreadable success or missing relied-on success fields retain unknown, immediately attempt the supported read listed below, then return either reconciled state or pending reconciliation. Auth/encode never-sent failures do not reread. A read failure/absence is never financial failure. Cancellation after dispatch is also uncertain and must settle before a new mutation.

| Write | Reread | Reference | Where in code | Connection-loss and never-sent test |
|---|---|---|---|---|
| create_order | getOrder only if a provider ID is already obtained from a durable receipt/approval callback; otherwise no invented search | known orderId | TBD | TBD |
| capture_order | getOrder, then getCapturedPayment for discovered captures | original orderId | packages/paypal-core/src/provider.ts:110 | tests/paypal-sdk.test.ts:36 and :51 |
| authorize_order | getOrder then getAuthorizedPayment | original orderId | TBD | TBD |
| capture_authorization | getAuthorizedPayment; owning getOrder, then getCapturedPayment if discoverable | authorizationId + known owning orderId | TBD | TBD |
| refund_capture | getRefund if known; otherwise owning getOrder payments.refunds, match customId to operationId, and getRefund; the domain supplies a complete current refundable budget | refundId or orderId + operationId | packages/paypal-core/src/provider.ts:110 | tests/paypal-core.test.ts:95; unknown-ID live correlation remains unqualified |
| void_authorization | getAuthorizedPayment | original authorizationId | TBD | TBD |

No create-order lookup by provider request ID exists in this SDK. When no resource ID was received, ordinary recovery stays pending reconciliation; the lab recorder may know more but must not grant the target an invented lookup. Refund correlation not returned by owning-order read also remains unknown; an aggregate refunded amount alone cannot prove this refund operation. These are explicit capability limitations, not open SDK lookups.

## CROSS-OPERATION INVARIANTS

| Invariant | Legal set | Enforcement | Test |
|---|---|---|---|
| Resource belongs to current tenant/project and approved action | caller's persisted grant + all relevant resource IDs | before claim in PaymentCore.execute | TBD |
| Capture requires genuine approved order or valid prior-consent capability | provider GET + current domain approval | before mutation | TBD |
| Refund amount is approved, positive integer minor units and no greater than confirmed remaining capture amount including pending reservations | fresh capture/order observations + locked claims | claim transaction | TBD |
| Changed payload cannot reuse operation/business identity | canonical immutable hash | duplicate-claim branch | TBD |
| Captures, refunds, authorizations, payments and fulfillment remain separate | normalized resource kinds | typed provider boundary and invariant evaluator | TBD |
| Faulty target attempts are observed, never repaired/deduplicated by core | neutral harness manifest | runner separate from core | TBD |

## OPTIONAL FIELDS

Every optional request field below is omitted unless a named row requires it. For create/capture/authorize/refund/capture-authorization/void, payPalRequestId is required by DUPLICATE CLAIMS. prefer='return=representation' is required by UNKNOWN OUTCOMES and the relied-on id/status/amount checks. payPalMockResponse is omitted except an explicitly declared qualified negative-test probe. payPalAuthAssertion, partner attribution and client metadata fields are omitted. Orders capture/authorize send an empty typed body {} for a browser-approved flow. A real sandbox authorize on 11 November returned415 without it because the pinned SDK omits Content-Type with an absent body. Empty JSON supplies application/json and no new payment source. Void has no body. Reads use only the required identifier; getOrder fields omitted (payment_source would expose unnecessary data).

Create body OrderRequest: required intent and purchaseUnits; optional processingInstruction,payer,paymentSource,applicationContext omitted in first browser-SDK flow. PurchaseUnitRequest amount required; customId set to the domain business intent for evidence correlation; referenceId set only when domain supplies a multi-unit allocation. Optional payee, paymentInstruction,description,invoiceId,softDescriptor,items,shipping,supplementaryData omitted unless an explicit later domain contract requires them. Money requires currencyCode/value, both strings; no null members. AmountWithBreakdown.breakdown omitted. Supported core currency exponent map is explicit; unknown currencies rejected rather than rounded.

CaptureRequest: amount supplied for approved amount; finalCapture supplied only when domain approval explicitly fixes final-capture behavior (otherwise SDK defaults false); invoiceId/paymentInstruction/noteToPayer/softDescriptor omitted. RefundRequest: amount required by exact approved remediation; customId=operationId required by UNKNOWN OUTCOMES; invoiceId/noteToPayer/paymentInstruction omitted. Transactions: startDate/endDate required; page/pageSize bounded pagination; allowed transactionId when supplied by scope; remaining filters omitted, preserving SDK fields='transaction_info' and balanceAffectingRecordsOnly='Y'.

An outgoing-wire test will assert no app-set field/header/query without a row above. Source default fields emitted by the SDK are separately enumerated in the appended resource tables.

## WHEN THE API SAYS NO

This table applies independently to every in-scope operation (createOrder, captureOrder, authorizeOrder, getOrder, captureAuthorizedPayment, getAuthorizedPayment, getCapturedPayment, refundCapturedPayment, getRefund, voidPayment, searchTransactions). Per-operation typed error arms are copied below; never switch on arm names across operations.

| Provider status / kind | App answer | Caller reads | Test |
|---|---|---|---|
| 4xx except 401/403/429 | same 4xx | fixed message and HTTP status; provider body excluded because it can echo personal data | tests/paypal-sdk.test.ts:56; further operation-specific refusals remain planned |
| 401/403 | 502 | Payment provider credentials unavailable | TBD |
| 429 | 503 | Payment provider quota temporarily unavailable | TBD |
| 5xx | 502 | Payment provider unavailable | TBD |
| connection/timeout/success-decode on write | 202 pending_reconciliation after reread | Checking provider outcome | TBD |
| no response on read | 502 | Provider state could not be confirmed | TBD |
| auth/encode | no mutation, no reread | Provider credential/configuration fault | TBD |
| decode on declared 4xx | map surviving provider status as above | Provider rejected the request; reason unreadable | TBD |
| unknown nonfamily throwable | rethrow | application error boundary | TBD |

## REST webhook intake

Source: https://developer.paypal.com/api/rest/webhooks/rest/ retrieved 2026-11-11. This SDK has no webhook verification operation. Signature postback is POST /v1/notifications/verify-webhook-signature with transmission_id,transmission_time,cert_url,auth_algo,transmission_sig,webhook_id and the exact original webhook_event JSON bytes embedded without reserializing. Header source names paypal-transmission-id/time, paypal-cert-url, paypal-auth-algo, paypal-transmission-sig. Accept only SUCCESS verification_status. Require configured project webhook ID and sandbox certificate host allowlist; never fetch arbitrary cert URLs. Keep every delivery attempt and deduplicate canonical event ID transactionally only after verification; signature failure cannot mutate commerce state. Simulator WEBHOOK_ID cannot use postback; separate synthetic test verifier is Sample only and unavailable to the live route. Authentic receipt/resend/redelivery qualification still pending.

## Assumptions and capability gates

Parent established the isolated US sandbox merchant/app/buyer and verified OAuth on 2026-11-11, authorizing this app's sandbox work. No provider request was made by this core milestone; F2/F4/F5/F8/F9/F10 remain unobserved. Credential presence/values are never printed. PostgreSQL DATABASE_URL uses a restricted project role; Vercel, Neon and Blob were provisioned by root. Webhook registration awaits the receiver route. No arbitrary repository code executes in the public judge process. Hosted judge will execute versioned curated fixtures only. Python/source-evaluation adapter and extension SDK operations require their own resolved sheet additions before implementation. Full scope remains recorded.

## First implementation checkpoint

`npm run verify:core` currently passes 34 cases; the checked-in evidence carries exact source hashes and adapter coverage. Tests bind SQL duplicate winners and payload conflicts (tests/paypal-core.test.ts:39), unknown rereads (:51, :59), never-sent auth (:66), terminal resource classification (:71), refund capacity and duplicate races (:78, :89, :95), database failures around external success (:102, :110), current authority (:122), webhook dead letters (:128), exact money (:143), redaction (:151), SDK create/capture/refund encoding (tests/paypal-sdk.test.ts), and REST postback bytes. All are Sample/local-conformance evidence. The control was tested independently before implementing intentionally faulty targets.

Runtime binding: PaymentCore dispatch/recovery in packages/paypal-core/src/core.ts; SQL claims/budgets/event intake in store.ts; public SDK operations in provider.ts; typed REST signature verification in webhook.ts. `packages/paypal-core/README.md` lists present versus absent capabilities. Unbound tests above remain explicit work; core conformance does not imply application scenario execution or live-provider qualification.

## REQUIRED READING

- MUST load typescript-integrate-paypal — read before authored implementation.
- MUST load typescript-getting-started — read; installed sdk-map.md + orders/payments/transaction-search maps read.
- MUST load typescript-client-initialization — read; explicit baseUrl fact comes from installed SDK (generic companion differs).
- MUST load typescript-authentication — read.
- MUST load typescript-calling-endpoints — read.
- MUST load typescript-models — read.
- MUST load typescript-error-handling — read.
- MUST load typescript-configuration-resilience — read.
- MUST load typescript-testing — read before tests.

## Exact signatures, field channels/defaults, errors and declaring sources

The following version-bound operation blocks are copied from the installed SDK map, not inferred from HTTP names. No open API lookup remains for the operations selected above.

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


### searchTransactions

- **Signature**: `searchTransactions(request: TransactionSearch.SearchTransactionsRequest, options?: RequestOptions): ApiPromise<SearchResponse, TransactionSearch.SearchTransactionsError>`
- **Wire**: `GET /v1/reporting/transactions`
- **Auth**: `oauth2`
- **Request body**: none — no `Content-Type` header is sent
- **Returns**: `SearchResponse`
- **Error**: `PaypalError` with `kind: "api"`, an instance of `TransactionSearch.SearchTransactionsError` — **typed arms**, narrowed on `err.payload.kind`
- **Error arms**: `"searchError"` [default — any status no arm above covers] `SearchError` · `"undeclared"` [a `default`-matched body that did not fit `SearchError`] `rawBody: ArrayBuffer`

**Fields** — `TransactionSearch.SearchTransactionsRequest` (14):

| Field | Channel | Wire | Type | Req | Default |
| --- | --- | --- | --- | --- | --- |
| `startDate` | `query` | `start_date` | `string` | yes | — |
| `endDate` | `query` | `end_date` | `string` | yes | — |
| `transactionId` | `query` | `transaction_id` | `string` | no | — |
| `transactionType` | `query` | `transaction_type` | `string` | no | — |
| `transactionStatus` | `query` | `transaction_status` | `string` | no | — |
| `transactionAmount` | `query` | `transaction_amount` | `string` | no | — |
| `transactionCurrency` | `query` | `transaction_currency` | `string` | no | — |
| `paymentInstrumentType` | `query` | `payment_instrument_type` | `string` | no | — |
| `storeId` | `query` | `store_id` | `string` | no | — |
| `terminalId` | `query` | `terminal_id` | `string` | no | — |
| `fields` | `query` | — | `string` | no | `"transaction_info"` |
| `balanceAffectingRecordsOnly` | `query` | `balance_affecting_records_only` | `string` | no | `"Y"` |
| `pageSize` | `query` | `page_size` | `number` | no | `100` |
| `page` | `query` | — | `number` | no | `1` |

| Type | Schema value | Source |
| --- | --- | --- |
| `SearchResponse` | `searchResponseSchema` | `src/models/search-response.ts` |
| `SearchError` | `searchErrorSchema` | `src/models/search-error.ts` |



## Model members, enums and wire aliases

Source declarations below bind the members set/read by the core. No required-nullable members occur in this selected payload subset. All read-back id/status/amount fields marked optional require explicit guards.


### Source node_modules/paypal/src/models/order-request.ts

SHA256 6687af6101184d4265fc58b4ef99b2fd747d26e799b3a0b4a254e12f2c85a1c7

```ts
import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";
import { checkoutPaymentIntentSchema, type CheckoutPaymentIntent } from "./checkout-payment-intent.js";
import { orderApplicationContextSchema, type OrderApplicationContext } from "./order-application-context.js";
import { payerSchema, type Payer } from "./payer.js";
import { paymentSourceSchema, type PaymentSource } from "./payment-source.js";
import { processingInstructionSchema, type ProcessingInstruction } from "./processing-instruction.js";
import { purchaseUnitRequestSchema, type PurchaseUnitRequest } from "./purchase-unit-request.js";
export type OrderRequest = {
  intent: CheckoutPaymentIntent;
  processingInstruction?: ProcessingInstruction;
  payer?: Payer;
  purchaseUnits: PurchaseUnitRequest[];
  paymentSource?: PaymentSource;
  applicationContext?: OrderApplicationContext;
};
export const orderRequestSchema: Schema<OrderRequest> = s.object<OrderRequest>({
  intent: checkoutPaymentIntentSchema,
  processingInstruction: s.optional(s.lazy(() => processingInstructionSchema)),
  payer: s.optional(s.lazy(() => payerSchema)),
  purchaseUnits: s.array(s.lazy(() => purchaseUnitRequestSchema)),
  paymentSource: s.optional(s.lazy(() => paymentSourceSchema)),
  applicationContext: s.optional(s.lazy(() => orderApplicationContextSchema)),
  _keysMap: {
    processingInstruction: "processing_instruction",
    purchaseUnits: "purchase_units",
    paymentSource: "payment_source",
    applicationContext: "application_context",
  },
});
```


### Source node_modules/paypal/src/models/purchase-unit-request.ts

SHA256 61cf52e042a169bc217f8cad6975397c4b58222b8622b3a25fd8a67f1bdc39f6

```ts
import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";
import { amountWithBreakdownSchema, type AmountWithBreakdown } from "./amount-with-breakdown.js";
import { itemRequestSchema, type ItemRequest } from "./item-request.js";
import { payeeBaseSchema, type PayeeBase } from "./payee-base.js";
import { paymentInstructionSchema, type PaymentInstruction } from "./payment-instruction.js";
import { shippingDetailsSchema, type ShippingDetails } from "./shipping-details.js";
import { supplementaryDataSchema, type SupplementaryData } from "./supplementary-data.js";
export type PurchaseUnitRequest = {
  referenceId?: string;
  amount: AmountWithBreakdown;
  payee?: PayeeBase;
  paymentInstruction?: PaymentInstruction;
  description?: string;
  customId?: string;
  invoiceId?: string;
  softDescriptor?: string;
  items?: ItemRequest[];
  shipping?: ShippingDetails;
  supplementaryData?: SupplementaryData;
};
export const purchaseUnitRequestSchema: Schema<PurchaseUnitRequest> = s.object<PurchaseUnitRequest>({
  referenceId: s.optional(s.string()),
  amount: amountWithBreakdownSchema,
  payee: s.optional(s.lazy(() => payeeBaseSchema)),
  paymentInstruction: s.optional(s.lazy(() => paymentInstructionSchema)),
  description: s.optional(s.string()),
  customId: s.optional(s.string()),
  invoiceId: s.optional(s.string()),
  softDescriptor: s.optional(s.string()),
  items: s.optional(s.array(s.lazy(() => itemRequestSchema))),
  shipping: s.optional(s.lazy(() => shippingDetailsSchema)),
  supplementaryData: s.optional(s.lazy(() => supplementaryDataSchema)),
  _keysMap: {
    referenceId: "reference_id",
    paymentInstruction: "payment_instruction",
    customId: "custom_id",
    invoiceId: "invoice_id",
    softDescriptor: "soft_descriptor",
    supplementaryData: "supplementary_data",
  },
});
```


### Source node_modules/paypal/src/models/amount-with-breakdown.ts

SHA256 052051ef4a59ff33329ad45c158a7629be5fc05bc25ae530193d6dfcb76a3de1

```ts
import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";
import { amountBreakdownSchema, type AmountBreakdown } from "./amount-breakdown.js";
export type AmountWithBreakdown = {
  currencyCode: string;
  value: string;
  breakdown?: AmountBreakdown;
};
export const amountWithBreakdownSchema: Schema<AmountWithBreakdown> = s.object<AmountWithBreakdown>({
  currencyCode: s.string(),
  value: s.string(),
  breakdown: s.optional(s.lazy(() => amountBreakdownSchema)),
  _keysMap: {
    currencyCode: "currency_code",
  },
});
```


### Source node_modules/paypal/src/models/money.ts

SHA256 c000bc9bb6802532e8bfd20e74b2126fc53e156250905ac195dbc55a1f8950f9

```ts
import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";
export type Money = {
  currencyCode: string;
  value: string;
};
export const moneySchema: Schema<Money> = s.object<Money>({
  currencyCode: s.string(),
  value: s.string(),
  _keysMap: {
    currencyCode: "currency_code",
  },
});
```


### Source node_modules/paypal/src/models/order.ts

SHA256 0f601bfd38481b53c7b1cbe5079b55f9f50860427da9661336c90429e356c469

```ts
import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";
import { checkoutPaymentIntentSchema, type CheckoutPaymentIntent } from "./checkout-payment-intent.js";
import { linkDescriptionSchema, type LinkDescription } from "./link-description.js";
import { orderStatusSchema, type OrderStatus } from "./order-status.js";
import { payerSchema, type Payer } from "./payer.js";
import { paymentSourceResponseSchema, type PaymentSourceResponse } from "./payment-source-response.js";
import { processingInstructionSchema, type ProcessingInstruction } from "./processing-instruction.js";
import { purchaseUnitSchema, type PurchaseUnit } from "./purchase-unit.js";
export type Order = {
  createTime?: string;
  updateTime?: string;
  id?: string;
  paymentSource?: PaymentSourceResponse;
  intent?: CheckoutPaymentIntent;
  processingInstruction?: ProcessingInstruction;
  payer?: Payer;
  purchaseUnits?: PurchaseUnit[];
  status?: OrderStatus;
  links?: LinkDescription[];
};
export const orderSchema: Schema<Order> = s.object<Order>({
  createTime: s.optional(s.string()),
  updateTime: s.optional(s.string()),
  id: s.optional(s.string()),
  paymentSource: s.optional(s.lazy(() => paymentSourceResponseSchema)),
  intent: s.optional(s.lazy(() => checkoutPaymentIntentSchema)),
  processingInstruction: s.optional(s.lazy(() => processingInstructionSchema)),
  payer: s.optional(s.lazy(() => payerSchema)),
  purchaseUnits: s.optional(s.array(s.lazy(() => purchaseUnitSchema))),
  status: s.optional(s.lazy(() => orderStatusSchema)),
  links: s.optional(s.array(s.lazy(() => linkDescriptionSchema))),
  _keysMap: {
    createTime: "create_time",
    updateTime: "update_time",
    paymentSource: "payment_source",
    processingInstruction: "processing_instruction",
    purchaseUnits: "purchase_units",
  },
});
```


### Source node_modules/paypal/src/models/purchase-unit.ts

SHA256 f11a0dfa33d2a463ece1bc29dd1c31f934a10f764f6ee906e6f89bbf21e92adb

```ts
import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";
import { amountWithBreakdownSchema, type AmountWithBreakdown } from "./amount-with-breakdown.js";
import { itemSchema, type Item } from "./item.js";
import { payeeBaseSchema, type PayeeBase } from "./payee-base.js";
import { paymentCollectionSchema, type PaymentCollection } from "./payment-collection.js";
import { paymentInstructionSchema, type PaymentInstruction } from "./payment-instruction.js";
import {
  shippingWithTrackingDetailsSchema,
  type ShippingWithTrackingDetails,
} from "./shipping-with-tracking-details.js";
import { supplementaryDataSchema, type SupplementaryData } from "./supplementary-data.js";
export type PurchaseUnit = {
  referenceId?: string;
  amount?: AmountWithBreakdown;
  payee?: PayeeBase;
  paymentInstruction?: PaymentInstruction;
  description?: string;
  customId?: string;
  invoiceId?: string;
  id?: string;
  softDescriptor?: string;
  items?: Item[];
  shipping?: ShippingWithTrackingDetails;
  supplementaryData?: SupplementaryData;
  payments?: PaymentCollection;
  mostRecentErrors?: Record<string, unknown>[];
};
export const purchaseUnitSchema: Schema<PurchaseUnit> = s.object<PurchaseUnit>({
  referenceId: s.optional(s.string()),
  amount: s.optional(s.lazy(() => amountWithBreakdownSchema)),
  payee: s.optional(s.lazy(() => payeeBaseSchema)),
  paymentInstruction: s.optional(s.lazy(() => paymentInstructionSchema)),
  description: s.optional(s.string()),
  customId: s.optional(s.string()),
  invoiceId: s.optional(s.string()),
  id: s.optional(s.string()),
  softDescriptor: s.optional(s.string()),
  items: s.optional(s.array(s.lazy(() => itemSchema))),
  shipping: s.optional(s.lazy(() => shippingWithTrackingDetailsSchema)),
  supplementaryData: s.optional(s.lazy(() => supplementaryDataSchema)),
  payments: s.optional(s.lazy(() => paymentCollectionSchema)),
  mostRecentErrors: s.optional(s.array(s.record(s.string(), s.unknown()))),
  _keysMap: {
    referenceId: "reference_id",
    paymentInstruction: "payment_instruction",
    customId: "custom_id",
    invoiceId: "invoice_id",
    softDescriptor: "soft_descriptor",
    supplementaryData: "supplementary_data",
    mostRecentErrors: "most_recent_errors",
  },
});
```


### Source node_modules/paypal/src/models/payment-collection.ts

SHA256 d4f6443faad147f4579bc57326d7bb94c5c36f5ccfb78b7b0a3f55baddf5f745

```ts
import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";
import {
  authorizationWithAdditionalDataSchema,
  type AuthorizationWithAdditionalData,
} from "./authorization-with-additional-data.js";
import { ordersCaptureSchema, type OrdersCapture } from "./orders-capture.js";
import { refundSchema, type Refund } from "./refund.js";
export type PaymentCollection = {
  authorizations?: AuthorizationWithAdditionalData[];
  captures?: OrdersCapture[];
  refunds?: Refund[];
};
export const paymentCollectionSchema: Schema<PaymentCollection> = s.object<PaymentCollection>({
  authorizations: s.optional(s.array(s.lazy(() => authorizationWithAdditionalDataSchema))),
  captures: s.optional(s.array(s.lazy(() => ordersCaptureSchema))),
  refunds: s.optional(s.array(s.lazy(() => refundSchema))),
});
```


### Source node_modules/paypal/src/models/orders-capture.ts

SHA256 77210240647ac72f914c92862ef879be43fb4343f9f9eef752b89424b9f17368

```ts
import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";
import { captureStatusDetailsSchema, type CaptureStatusDetails } from "./capture-status-details.js";
import { captureStatusSchema, type CaptureStatus } from "./capture-status.js";
import { DisbursementMode, disbursementModeSchema } from "./disbursement-mode.js";
import { linkDescriptionSchema, type LinkDescription } from "./link-description.js";
import { moneySchema, type Money } from "./money.js";
import { networkTransactionSchema, type NetworkTransaction } from "./network-transaction.js";
import { processorResponseSchema, type ProcessorResponse } from "./processor-response.js";
import { sellerProtectionSchema, type SellerProtection } from "./seller-protection.js";
import {
  sellerReceivableBreakdownSchema,
  type SellerReceivableBreakdown,
} from "./seller-receivable-breakdown.js";
export type OrdersCapture = {
  status?: CaptureStatus;
  statusDetails?: CaptureStatusDetails;
  id?: string;
  amount?: Money;
  invoiceId?: string;
  customId?: string;
  networkTransactionReference?: NetworkTransaction;
  sellerProtection?: SellerProtection;
  finalCapture?: boolean;
  sellerReceivableBreakdown?: SellerReceivableBreakdown;
  disbursementMode?: DisbursementMode;
  links?: LinkDescription[];
  processorResponse?: ProcessorResponse;
  createTime?: string;
  updateTime?: string;
};
export const ordersCaptureSchema: Schema<OrdersCapture> = s.object<OrdersCapture>({
  status: s.optional(s.lazy(() => captureStatusSchema)),
  statusDetails: s.optional(s.lazy(() => captureStatusDetailsSchema)),
  id: s.optional(s.string()),
  amount: s.optional(s.lazy(() => moneySchema)),
  invoiceId: s.optional(s.string()),
  customId: s.optional(s.string()),
  networkTransactionReference: s.optional(s.lazy(() => networkTransactionSchema)),
  sellerProtection: s.optional(s.lazy(() => sellerProtectionSchema)),
  finalCapture: s.defaulted(s.boolean(), false),
  sellerReceivableBreakdown: s.optional(s.lazy(() => sellerReceivableBreakdownSchema)),
  disbursementMode: s.defaulted(disbursementModeSchema, DisbursementMode.Instant),
  links: s.optional(s.array(s.lazy(() => linkDescriptionSchema))),
  processorResponse: s.optional(s.lazy(() => processorResponseSchema)),
  createTime: s.optional(s.string()),
  updateTime: s.optional(s.string()),
  _keysMap: {
    statusDetails: "status_details",
    invoiceId: "invoice_id",
    customId: "custom_id",
    networkTransactionReference: "network_transaction_reference",
    sellerProtection: "seller_protection",
    finalCapture: "final_capture",
    sellerReceivableBreakdown: "seller_receivable_breakdown",
    disbursementMode: "disbursement_mode",
    processorResponse: "processor_response",
    createTime: "create_time",
    updateTime: "update_time",
  },
});
```


### Source node_modules/paypal/src/models/authorization-with-additional-data.ts

SHA256 599f474c3a2eff5a0aa4485fa3c0172021495cd4aeb30ad0c1a4ace6e4dd8cba

```ts
import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";
import {
  authorizationStatusDetailsSchema,
  type AuthorizationStatusDetails,
} from "./authorization-status-details.js";
import { authorizationStatusSchema, type AuthorizationStatus } from "./authorization-status.js";
import { linkDescriptionSchema, type LinkDescription } from "./link-description.js";
import { moneySchema, type Money } from "./money.js";
import { networkTransactionSchema, type NetworkTransaction } from "./network-transaction.js";
import { processorResponseSchema, type ProcessorResponse } from "./processor-response.js";
import { sellerProtectionSchema, type SellerProtection } from "./seller-protection.js";
export type AuthorizationWithAdditionalData = {
  status?: AuthorizationStatus;
  statusDetails?: AuthorizationStatusDetails;
  id?: string;
  amount?: Money;
  invoiceId?: string;
  customId?: string;
  networkTransactionReference?: NetworkTransaction;
  sellerProtection?: SellerProtection;
  expirationTime?: string;
  links?: LinkDescription[];
  createTime?: string;
  updateTime?: string;
  processorResponse?: ProcessorResponse;
};
export const authorizationWithAdditionalDataSchema: Schema<AuthorizationWithAdditionalData> =
  s.object<AuthorizationWithAdditionalData>({
    status: s.optional(s.lazy(() => authorizationStatusSchema)),
    statusDetails: s.optional(s.lazy(() => authorizationStatusDetailsSchema)),
    id: s.optional(s.string()),
    amount: s.optional(s.lazy(() => moneySchema)),
    invoiceId: s.optional(s.string()),
    customId: s.optional(s.string()),
    networkTransactionReference: s.optional(s.lazy(() => networkTransactionSchema)),
    sellerProtection: s.optional(s.lazy(() => sellerProtectionSchema)),
    expirationTime: s.optional(s.string()),
    links: s.optional(s.array(s.lazy(() => linkDescriptionSchema))),
    createTime: s.optional(s.string()),
    updateTime: s.optional(s.string()),
    processorResponse: s.optional(s.lazy(() => processorResponseSchema)),
    _keysMap: {
      statusDetails: "status_details",
      invoiceId: "invoice_id",
      customId: "custom_id",
      networkTransactionReference: "network_transaction_reference",
      sellerProtection: "seller_protection",
      expirationTime: "expiration_time",
      createTime: "create_time",
      updateTime: "update_time",
      processorResponse: "processor_response",
    },
  });
```


### Source node_modules/paypal/src/models/order-authorize-response.ts

SHA256 bf98f5117b2f62418bd893681fb0aae32580987f0374d55c6e5a1a5dcfb4dff3

```ts
import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";
import { checkoutPaymentIntentSchema, type CheckoutPaymentIntent } from "./checkout-payment-intent.js";
import { linkDescriptionSchema, type LinkDescription } from "./link-description.js";
import {
  orderAuthorizeResponsePaymentSourceSchema,
  type OrderAuthorizeResponsePaymentSource,
} from "./order-authorize-response-payment-source.js";
import { orderStatusSchema, type OrderStatus } from "./order-status.js";
import { payerSchema, type Payer } from "./payer.js";
import { processingInstructionSchema, type ProcessingInstruction } from "./processing-instruction.js";
import { purchaseUnitSchema, type PurchaseUnit } from "./purchase-unit.js";
export type OrderAuthorizeResponse = {
  createTime?: string;
  updateTime?: string;
  id?: string;
  paymentSource?: OrderAuthorizeResponsePaymentSource;
  intent?: CheckoutPaymentIntent;
  processingInstruction?: ProcessingInstruction;
  payer?: Payer;
  purchaseUnits?: PurchaseUnit[];
  status?: OrderStatus;
  links?: LinkDescription[];
};
export const orderAuthorizeResponseSchema: Schema<OrderAuthorizeResponse> = s.object<OrderAuthorizeResponse>({
  createTime: s.optional(s.string()),
  updateTime: s.optional(s.string()),
  id: s.optional(s.string()),
  paymentSource: s.optional(s.lazy(() => orderAuthorizeResponsePaymentSourceSchema)),
  intent: s.optional(s.lazy(() => checkoutPaymentIntentSchema)),
  processingInstruction: s.optional(s.lazy(() => processingInstructionSchema)),
  payer: s.optional(s.lazy(() => payerSchema)),
  purchaseUnits: s.optional(s.array(s.lazy(() => purchaseUnitSchema))),
  status: s.optional(s.lazy(() => orderStatusSchema)),
  links: s.optional(s.array(s.lazy(() => linkDescriptionSchema))),
  _keysMap: {
    createTime: "create_time",
    updateTime: "update_time",
    paymentSource: "payment_source",
    processingInstruction: "processing_instruction",
    purchaseUnits: "purchase_units",
  },
});
```


### Source node_modules/paypal/src/models/capture-request.ts

SHA256 0ee59b3c8fadf6b863dbc758596e2cb77ae63d5ffdf1b702a56aabd5db6320b4

```ts
import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";
import {
  capturePaymentInstructionSchema,
  type CapturePaymentInstruction,
} from "./capture-payment-instruction.js";
import { moneySchema, type Money } from "./money.js";
export type CaptureRequest = {
  amount?: Money;
  invoiceId?: string;
  finalCapture?: boolean;
  paymentInstruction?: CapturePaymentInstruction;
  noteToPayer?: string;
  softDescriptor?: string;
};
export const captureRequestSchema: Schema<CaptureRequest> = s.object<CaptureRequest>({
  amount: s.optional(s.lazy(() => moneySchema)),
  invoiceId: s.optional(s.string()),
  finalCapture: s.defaulted(s.boolean(), false),
  paymentInstruction: s.optional(s.lazy(() => capturePaymentInstructionSchema)),
  noteToPayer: s.optional(s.string()),
  softDescriptor: s.optional(s.string()),
  _keysMap: {
    invoiceId: "invoice_id",
    finalCapture: "final_capture",
    paymentInstruction: "payment_instruction",
    noteToPayer: "note_to_payer",
    softDescriptor: "soft_descriptor",
  },
});
```


### Source node_modules/paypal/src/models/captured-payment.ts

SHA256 e4efe4d964bbe17ff3d04271e70074ae015ed053fe1e33cebf7b5ad60b133081

```ts
import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";
import { captureStatusDetailsSchema, type CaptureStatusDetails } from "./capture-status-details.js";
import { captureStatusSchema, type CaptureStatus } from "./capture-status.js";
import { DisbursementMode, disbursementModeSchema } from "./disbursement-mode.js";
import { linkDescriptionSchema, type LinkDescription } from "./link-description.js";
import { moneySchema, type Money } from "./money.js";
import { networkTransactionSchema, type NetworkTransaction } from "./network-transaction.js";
import { payeeBaseSchema, type PayeeBase } from "./payee-base.js";
import {
  paymentSupplementaryDataSchema,
  type PaymentSupplementaryData,
} from "./payment-supplementary-data.js";
import { processorResponseSchema, type ProcessorResponse } from "./processor-response.js";
import { sellerProtectionSchema, type SellerProtection } from "./seller-protection.js";
import {
  sellerReceivableBreakdownSchema,
  type SellerReceivableBreakdown,
} from "./seller-receivable-breakdown.js";
export type CapturedPayment = {
  status?: CaptureStatus;
  statusDetails?: CaptureStatusDetails;
  id?: string;
  amount?: Money;
  invoiceId?: string;
  customId?: string;
  networkTransactionReference?: NetworkTransaction;
  sellerProtection?: SellerProtection;
  finalCapture?: boolean;
  sellerReceivableBreakdown?: SellerReceivableBreakdown;
  disbursementMode?: DisbursementMode;
  links?: LinkDescription[];
  processorResponse?: ProcessorResponse;
  createTime?: string;
  updateTime?: string;
  supplementaryData?: PaymentSupplementaryData;
  payee?: PayeeBase;
};
export const capturedPaymentSchema: Schema<CapturedPayment> = s.object<CapturedPayment>({
  status: s.optional(s.lazy(() => captureStatusSchema)),
  statusDetails: s.optional(s.lazy(() => captureStatusDetailsSchema)),
  id: s.optional(s.string()),
  amount: s.optional(s.lazy(() => moneySchema)),
  invoiceId: s.optional(s.string()),
  customId: s.optional(s.string()),
  networkTransactionReference: s.optional(s.lazy(() => networkTransactionSchema)),
  sellerProtection: s.optional(s.lazy(() => sellerProtectionSchema)),
  finalCapture: s.defaulted(s.boolean(), false),
  sellerReceivableBreakdown: s.optional(s.lazy(() => sellerReceivableBreakdownSchema)),
  disbursementMode: s.defaulted(disbursementModeSchema, DisbursementMode.Instant),
  links: s.optional(s.array(s.lazy(() => linkDescriptionSchema))),
  processorResponse: s.optional(s.lazy(() => processorResponseSchema)),
  createTime: s.optional(s.string()),
  updateTime: s.optional(s.string()),
  supplementaryData: s.optional(s.lazy(() => paymentSupplementaryDataSchema)),
  payee: s.optional(s.lazy(() => payeeBaseSchema)),
  _keysMap: {
    statusDetails: "status_details",
    invoiceId: "invoice_id",
    customId: "custom_id",
    networkTransactionReference: "network_transaction_reference",
    sellerProtection: "seller_protection",
    finalCapture: "final_capture",
    sellerReceivableBreakdown: "seller_receivable_breakdown",
    disbursementMode: "disbursement_mode",
    processorResponse: "processor_response",
    createTime: "create_time",
    updateTime: "update_time",
    supplementaryData: "supplementary_data",
  },
});
```


### Source node_modules/paypal/src/models/payment-authorization.ts

SHA256 48e98f83f7f633a87d8cbc03c184ffbc9af29f7d585afdb196ba2ef790d092b2

```ts
import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";
import {
  authorizationStatusDetailsSchema,
  type AuthorizationStatusDetails,
} from "./authorization-status-details.js";
import { authorizationStatusSchema, type AuthorizationStatus } from "./authorization-status.js";
import { linkDescriptionSchema, type LinkDescription } from "./link-description.js";
import { moneySchema, type Money } from "./money.js";
import { networkTransactionSchema, type NetworkTransaction } from "./network-transaction.js";
import { payeeBaseSchema, type PayeeBase } from "./payee-base.js";
import {
  paymentSupplementaryDataSchema,
  type PaymentSupplementaryData,
} from "./payment-supplementary-data.js";
import { sellerProtectionSchema, type SellerProtection } from "./seller-protection.js";
export type PaymentAuthorization = {
  status?: AuthorizationStatus;
  statusDetails?: AuthorizationStatusDetails;
  id?: string;
  amount?: Money;
  invoiceId?: string;
  customId?: string;
  networkTransactionReference?: NetworkTransaction;
  sellerProtection?: SellerProtection;
  expirationTime?: string;
  links?: LinkDescription[];
  createTime?: string;
  updateTime?: string;
  supplementaryData?: PaymentSupplementaryData;
  payee?: PayeeBase;
};
export const paymentAuthorizationSchema: Schema<PaymentAuthorization> = s.object<PaymentAuthorization>({
  status: s.optional(s.lazy(() => authorizationStatusSchema)),
  statusDetails: s.optional(s.lazy(() => authorizationStatusDetailsSchema)),
  id: s.optional(s.string()),
  amount: s.optional(s.lazy(() => moneySchema)),
  invoiceId: s.optional(s.string()),
  customId: s.optional(s.string()),
  networkTransactionReference: s.optional(s.lazy(() => networkTransactionSchema)),
  sellerProtection: s.optional(s.lazy(() => sellerProtectionSchema)),
  expirationTime: s.optional(s.string()),
  links: s.optional(s.array(s.lazy(() => linkDescriptionSchema))),
  createTime: s.optional(s.string()),
  updateTime: s.optional(s.string()),
  supplementaryData: s.optional(s.lazy(() => paymentSupplementaryDataSchema)),
  payee: s.optional(s.lazy(() => payeeBaseSchema)),
  _keysMap: {
    statusDetails: "status_details",
    invoiceId: "invoice_id",
    customId: "custom_id",
    networkTransactionReference: "network_transaction_reference",
    sellerProtection: "seller_protection",
    expirationTime: "expiration_time",
    createTime: "create_time",
    updateTime: "update_time",
    supplementaryData: "supplementary_data",
  },
});
```


### Source node_modules/paypal/src/models/refund-request.ts

SHA256 0ad8c80f590d83236caa73f39a9a09ee812ae8adc2aad6ed50e48a26e83ca944

```ts
import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";
import { moneySchema, type Money } from "./money.js";
import {
  refundPaymentInstructionSchema,
  type RefundPaymentInstruction,
} from "./refund-payment-instruction.js";
export type RefundRequest = {
  amount?: Money;
  customId?: string;
  invoiceId?: string;
  noteToPayer?: string;
  paymentInstruction?: RefundPaymentInstruction;
};
export const refundRequestSchema: Schema<RefundRequest> = s.object<RefundRequest>({
  amount: s.optional(s.lazy(() => moneySchema)),
  customId: s.optional(s.string()),
  invoiceId: s.optional(s.string()),
  noteToPayer: s.optional(s.string()),
  paymentInstruction: s.optional(s.lazy(() => refundPaymentInstructionSchema)),
  _keysMap: {
    customId: "custom_id",
    invoiceId: "invoice_id",
    noteToPayer: "note_to_payer",
    paymentInstruction: "payment_instruction",
  },
});
```


### Source node_modules/paypal/src/models/refund.ts

SHA256 8f5e1d9397ffd31166063aab364e8edc1f53d3b6f203b0a54b1b0a96bc178c1e

```ts
import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";
import { linkDescriptionSchema, type LinkDescription } from "./link-description.js";
import { moneySchema, type Money } from "./money.js";
import { payeeBaseSchema, type PayeeBase } from "./payee-base.js";
import { refundStatusDetailsSchema, type RefundStatusDetails } from "./refund-status-details.js";
import { refundStatusSchema, type RefundStatus } from "./refund-status.js";
import { sellerPayableBreakdownSchema, type SellerPayableBreakdown } from "./seller-payable-breakdown.js";
export type Refund = {
  status?: RefundStatus;
  statusDetails?: RefundStatusDetails;
  id?: string;
  amount?: Money;
  invoiceId?: string;
  customId?: string;
  acquirerReferenceNumber?: string;
  noteToPayer?: string;
  sellerPayableBreakdown?: SellerPayableBreakdown;
  payer?: PayeeBase;
  links?: LinkDescription[];
  createTime?: string;
  updateTime?: string;
};
export const refundSchema: Schema<Refund> = s.object<Refund>({
  status: s.optional(s.lazy(() => refundStatusSchema)),
  statusDetails: s.optional(s.lazy(() => refundStatusDetailsSchema)),
  id: s.optional(s.string()),
  amount: s.optional(s.lazy(() => moneySchema)),
  invoiceId: s.optional(s.string()),
  customId: s.optional(s.string()),
  acquirerReferenceNumber: s.optional(s.string()),
  noteToPayer: s.optional(s.string()),
  sellerPayableBreakdown: s.optional(s.lazy(() => sellerPayableBreakdownSchema)),
  payer: s.optional(s.lazy(() => payeeBaseSchema)),
  links: s.optional(s.array(s.lazy(() => linkDescriptionSchema))),
  createTime: s.optional(s.string()),
  updateTime: s.optional(s.string()),
  _keysMap: {
    statusDetails: "status_details",
    invoiceId: "invoice_id",
    customId: "custom_id",
    acquirerReferenceNumber: "acquirer_reference_number",
    noteToPayer: "note_to_payer",
    sellerPayableBreakdown: "seller_payable_breakdown",
    createTime: "create_time",
    updateTime: "update_time",
  },
});
```


### Source node_modules/paypal/src/models/error.ts

SHA256 91287c57161213dcc669aa1d5ff0f0fbc71d5663f7cca14a468cf69398ed4805

```ts
import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";
import { errorDetailsSchema, type ErrorDetails } from "./error-details.js";
import { linkDescriptionSchema, type LinkDescription } from "./link-description.js";
export type Error = {
  name: string;
  message: string;
  debugId: string;
  details?: ErrorDetails[];
  links?: LinkDescription[];
};
export const errorSchema: Schema<Error> = s.object<Error>({
  name: s.string(),
  message: s.string(),
  debugId: s.string(),
  details: s.optional(s.array(s.lazy(() => errorDetailsSchema))),
  links: s.optional(s.array(s.lazy(() => linkDescriptionSchema))),
  _keysMap: {
    debugId: "debug_id",
  },
});
```


### Source node_modules/paypal/src/models/error-details.ts

SHA256 1aba7655360a174b2e52e5110b67d13bda751881514d41afbbcf6aaf7ec4c31f

```ts
import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";
import { linkDescriptionSchema, type LinkDescription } from "./link-description.js";
export type ErrorDetails = {
  field?: string;
  value?: string;
  location?: string;
  issue: string;
  links?: LinkDescription[];
  description?: string;
};
export const errorDetailsSchema: Schema<ErrorDetails> = s.object<ErrorDetails>({
  field: s.optional(s.string()),
  value: s.optional(s.string()),
  location: s.defaulted(s.string(), "body"),
  issue: s.string(),
  links: s.optional(s.array(s.lazy(() => linkDescriptionSchema))),
  description: s.optional(s.string()),
});
```


### Source node_modules/paypal/src/models/checkout-payment-intent.ts

SHA256 b3dda2c2ba29233a63aae7b0ec80a4fa15735ad0c871647b84ceb6ef4642ca73

```ts
import * as s from "../core/validation/index.js";
import type { EnumSchema } from "../core/validation/schema.js";
export const CheckoutPaymentIntent = {
  Capture: "CAPTURE",
  Authorize: "AUTHORIZE",
} as const;
export type CheckoutPaymentIntent =
  | (typeof CheckoutPaymentIntent)[keyof typeof CheckoutPaymentIntent]
  | (string & {});
export const checkoutPaymentIntentSchema: EnumSchema<CheckoutPaymentIntent> =
  s.enumOf<CheckoutPaymentIntent>(CheckoutPaymentIntent);
```


### Source node_modules/paypal/src/models/order-status.ts

SHA256 408bd42f8b3ef64a52cfdf522a26a92ca62ec8ada0dba783479d7b8ac2683f0a

```ts
import * as s from "../core/validation/index.js";
import type { EnumSchema } from "../core/validation/schema.js";
export const OrderStatus = {
  Created: "CREATED",
  Saved: "SAVED",
  Approved: "APPROVED",
  Voided: "VOIDED",
  Completed: "COMPLETED",
  PayerActionRequired: "PAYER_ACTION_REQUIRED",
} as const;
export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus] | (string & {});
export const orderStatusSchema: EnumSchema<OrderStatus> = s.enumOf<OrderStatus>(OrderStatus);
```


### Source node_modules/paypal/src/models/capture-status.ts

SHA256 5df480d41a7b16a4777b2d4bdaa62df6f1d4f2a32529ae2a06157934261594ff

```ts
import * as s from "../core/validation/index.js";
import type { EnumSchema } from "../core/validation/schema.js";
export const CaptureStatus = {
  Completed: "COMPLETED",
  Declined: "DECLINED",
  PartiallyRefunded: "PARTIALLY_REFUNDED",
  Pending: "PENDING",
  Refunded: "REFUNDED",
  Failed: "FAILED",
} as const;
export type CaptureStatus = (typeof CaptureStatus)[keyof typeof CaptureStatus] | (string & {});
export const captureStatusSchema: EnumSchema<CaptureStatus> = s.enumOf<CaptureStatus>(CaptureStatus);
```


### Source node_modules/paypal/src/models/refund-status.ts

SHA256 490c52d82a3b62fc4e8d03a115ba126d204a39fcd502471705c5859072fd34ce

```ts
import * as s from "../core/validation/index.js";
import type { EnumSchema } from "../core/validation/schema.js";
export const RefundStatus = {
  Cancelled: "CANCELLED",
  Failed: "FAILED",
  Pending: "PENDING",
  Completed: "COMPLETED",
} as const;
export type RefundStatus = (typeof RefundStatus)[keyof typeof RefundStatus] | (string & {});
export const refundStatusSchema: EnumSchema<RefundStatus> = s.enumOf<RefundStatus>(RefundStatus);
```


### Source node_modules/paypal/src/models/authorization-status.ts

SHA256 a4b3950e3358741ac995827becd002f10c8ace95da385dbb38d162c3070c4950

```ts
import * as s from "../core/validation/index.js";
import type { EnumSchema } from "../core/validation/schema.js";
export const AuthorizationStatus = {
  Created: "CREATED",
  Captured: "CAPTURED",
  Denied: "DENIED",
  PartiallyCaptured: "PARTIALLY_CAPTURED",
  Voided: "VOIDED",
  Pending: "PENDING",
} as const;
export type AuthorizationStatus =
  | (typeof AuthorizationStatus)[keyof typeof AuthorizationStatus]
  | (string & {});
export const authorizationStatusSchema: EnumSchema<AuthorizationStatus> =
  s.enumOf<AuthorizationStatus>(AuthorizationStatus);
```


### Source node_modules/paypal/src/models/search-response.ts

SHA256 bd6305d283232e988245227e5a2e832cb97b19eb2ff8a16b4af08ad2642213dd

```ts
import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";
import { linkDescriptionSchema, type LinkDescription } from "./link-description.js";
import { transactionDetailsSchema, type TransactionDetails } from "./transaction-details.js";
export type SearchResponse = {
  transactionDetails?: TransactionDetails[];
  accountNumber?: string;
  startDate?: string;
  endDate?: string;
  lastRefreshedDatetime?: string;
  page?: number;
  totalItems?: number;
  totalPages?: number;
  links?: LinkDescription[];
};
export const searchResponseSchema: Schema<SearchResponse> = s.object<SearchResponse>({
  transactionDetails: s.optional(s.array(s.lazy(() => transactionDetailsSchema))),
  accountNumber: s.optional(s.string()),
  startDate: s.optional(s.string()),
  endDate: s.optional(s.string()),
  lastRefreshedDatetime: s.optional(s.string()),
  page: s.optional(s.int()),
  totalItems: s.optional(s.int()),
  totalPages: s.optional(s.int()),
  links: s.optional(s.array(s.lazy(() => linkDescriptionSchema))),
  _keysMap: {
    transactionDetails: "transaction_details",
    accountNumber: "account_number",
    startDate: "start_date",
    endDate: "end_date",
    lastRefreshedDatetime: "last_refreshed_datetime",
    totalItems: "total_items",
    totalPages: "total_pages",
  },
});
```


### Source node_modules/paypal/src/models/search-error.ts

SHA256 1eacd7ea457b20c3b4f1d8f1fc67695205345d733cf250c799ba6a5dd110b983

```ts
import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";
import { linkDescriptionSchema, type LinkDescription } from "./link-description.js";
import {
  transactionSearchErrorDetailsSchema,
  type TransactionSearchErrorDetails,
} from "./transaction-search-error-details.js";
export type SearchError = {
  name: string;
  message: string;
  debugId: string;
  informationLink?: string;
  details?: TransactionSearchErrorDetails[];
  links?: LinkDescription[];
  totalItems?: number;
  maximumItems?: number;
};
export const searchErrorSchema: Schema<SearchError> = s.object<SearchError>({
  name: s.string(),
  message: s.string(),
  debugId: s.string(),
  informationLink: s.optional(s.string()),
  details: s.optional(s.array(s.lazy(() => transactionSearchErrorDetailsSchema))),
  links: s.optional(s.array(s.lazy(() => linkDescriptionSchema))),
  totalItems: s.optional(s.int()),
  maximumItems: s.optional(s.int()),
  _keysMap: {
    debugId: "debug_id",
    informationLink: "information_link",
    totalItems: "total_items",
    maximumItems: "maximum_items",
  },
});
```


### Source node_modules/paypal/src/models/link-description.ts

SHA256 451bb018397a76ae22b47444b1d0587764d51b5310987ef9c6f98a1a52840c85

```ts
import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";
import { linkHttpMethodSchema, type LinkHttpMethod } from "./link-http-method.js";
export type LinkDescription = {
  href: string;
  rel: string;
  method?: LinkHttpMethod;
};
export const linkDescriptionSchema: Schema<LinkDescription> = s.object<LinkDescription>({
  href: s.string(),
  rel: s.string(),
  method: s.optional(s.lazy(() => linkHttpMethodSchema)),
});
```

## Private Vault capability qualification (root, 11 November)

Lookup bound to installed Vault resource and public models in paypal2.29.0: createSetupToken({payPalRequestId,body:SetupTokenRequest}), getSetupToken({id}), createPaymentToken({payPalRequestId,body:PaymentTokenRequest}), getPaymentToken({id}). Writes use /v3/vault/setup-tokens and /payment-tokens; generated request-ID retention says3hours. Response identity is optional in types and must be explicitly present. Setup must be independently read as APPROVED before exchanging paymentSource.token={id,type:SETUP_TOKEN}. Returned payment/customer identity remains private; no raw response body is emitted.

Isolated Fracture US sandbox only, same controlled buyer. No-purchase wallet setup sends usageType MERCHANT, customerType CONSUMER, usagePattern UNSCHEDULED_PREPAID, permitMultiplePaymentTokens=false and NO_SHIPPING experience with localhost4104 return/cancel; setup description limits this qualification to one $1 test charge and refund. Durable private operation/request/body hashes are written before each call; unknown results are never blindly retried. Optional customer/contact/billingPlan/shipping/card fields omitted. An eligible token plus exact recorded current consent can enter the guarded create_order.savedWallet flow; observed order/capture state, never token existence, proves money.

Official flow checked: https://developer.paypal.com/api/payment-tokens/save-without-purchase/paypal (updated14October2026). Actual eligibility/consent/result remain to be tested. This private probe is not a product Vault implementation or a live-money mandate.

## Version0.2.2 itemized single-unit Orders contract (11 November)

Opening Night requires a VIP ticket's USD35 admission and USD15 soundcheck perk to exist as actual Orders items. Same `orders.createOrder` operation/host/headers/error arms as above; no new endpoint or permissions. Read sources: installed `src/models/purchase-unit-request.ts` imports `ItemRequest[]` for optional items; `src/models/item-request.ts` requires name:string, unitAmount:Money and quantity:string, with optional sku:string. `src/models/amount-with-breakdown.ts` allows breakdown:AmountBreakdown, whose `itemTotal?:Money` maps to `item_total`. Money.currencyCode→currency_code and ItemRequest.unitAmount→unit_amount. These fields have no SDK defaults. Extra item URL/image/tax/category/description/billingPlan/upc and other breakdown fields remain omitted.

Core addition: optional create_order.items array of {name,unitAmount:{currency,minor},quantity:number,sku?:string}. Application limits (deliberately narrower than general Orders):1–100items; nonblank names and optional SKUs at most127characters; quantities safe whole1–9999; positive supported-currency minor units. All item currencies must equal order currency. BigInt sum(unit minor×quantity) must equal the approved order total exactly. This excludes unmodeled shipping/tax/discount surcharges. Reject malformed breakdowns before claim and again before dispatch; itemization enters canonical payloadHash. Adapter builds typed ItemRequest objects and amount.breakdown.itemTotal from the approved total. Refund remains a capture-level operation; attribution to a ticket component is domain evidence, not a PayPal item-refund feature.

Verification: actual installed-SDK wire serialization for two VIP components, mismatch/foreigncurrency/fraction/empty/overflow/text guards before traffic, and changed itemization cannot reuse an operation identity. Package verification runs PostgreSQL+SQLite conformance and TypeScript build. Live itemized create/read qualification is separate and will not claim80ticket captures.

## Version 0.2.3: consent-bound save during first purchase (11 November)

Scope: extend the existing sandbox-only Orders create payload; no new endpoint, auth scope, host or retry behavior. Baseline 69 PostgreSQL/SQLite and real-SDK fixture tests passed, followed by package TypeScript build. Existing SDK initialization, auth, errors, execution, persistence and redaction contracts above remain binding. Public SDK identity remains paypal 2.29.0 at 5d0df8a8817e5fdf2e2cd48e68f790ea4730aab2.

Exact operation: orders.createOrder(request: Orders.CreateOrderRequest, options?: RequestOptions): ApiPromise<Order, Orders.CreateOrderError>; POST /v2/checkout/orders with required application/json body:OrderRequest. Optional headers are payPalRequestId→PayPal-Request-Id, prefer→Prefer (default return=minimal, overridden return=representation), payPalMockResponse→PayPal-Mock-Response, payPalPartnerAttributionId→PayPal-Partner-Attribution-Id, payPalClientMetadataId→PayPal-Client-Metadata-Id, payPalAuthAssertion→PayPal-Auth-Assertion. SDK additionally mints Idempotency-Key per call; our durable PayPal-Request-Id remains authoritative. API error arms: error [400], error2 [401], error3 422, error4 default, undeclared if the default body cannot decode. Existing exhaustive error-family adapter is unchanged.

Read installed sdk-map.md and map/operations/orders.md plus source models order-request, payment-source, pay-pal-wallet, pay-pal-wallet-attributes, pay-pal-wallet-vault-instruction, store-in-vault-instruction, pay-pal-payment-token-usage-type and response equivalents. Every intermediate request member is optional: body.paymentSource.paypal.attributes.vault. Vault instruction requires usageType (wire usage_type), whose SDK enum has MERCHANT and PLATFORM; core supports MERCHANT only. storeInVault (wire store_in_vault) is optional in SDK, explicitly ON_SUCCESS in core. customerType defaults CONSUMER and permitMultiplePaymentTokens defaults false; wire emits customer_type and permit_multiple_payment_tokens. Optional description and usagePattern are omitted. ON_SUCCESS means after at least one successful authorization or capture. Request contains no payer PII.

Public action adds optional saveWalletOnSuccess:{consentId,consentVersion,consentDigest,usageType:MERCHANT}. Require nonblank bounded ID/digest and positive integer version, buyer-present experience with domain-granted return/cancel origins, and no simultaneous savedWallet. Policy must return exact saveWalletConsent with those fields and a valid future expiresAt. Validate before claim and immediately before dispatch. These fields enter payloadHash; receipt status cannot itself prove vault success. The existing amount/approval/origin gates remain active. Replayed changed consent is a payload conflict.

Provider sends only attributes.vault={storeInVault:ON_SUCCESS,usageType:MERCHANT}; never consent identifiers. Normalized public core receipts continue to exclude payment-source token/customer IDs. Domain must reread its exact owned order through the typed SDK after an observed capture/authorization, explicitly check returned optional vault ID, correlate its logged-in payer, and encrypt the token. A missing token stays unresolved, never an invented mandate. WorldKit owns token read/delete and exact wallet authority.

Official primary reference checked: https://developer.paypal.com/sdk/js/v5/save-with-purchase/paypal (updated October 1,2026). The page contains conflicting introductory advice despite documenting this flow; no production-readiness claim will be made. Signed-in payer identity, explicit save consent and actual sandbox qualification are required. No new live side effect is claimed by local wire tests. Existing actual create/get capability was separately qualified under the same isolated merchant; the new vault behavior requires its own one-dollar sandbox approval/capture/read/refund qualification.

Verification: real pinned SDK serialization through its fetch seam; absent/expired/mismatched consent; absent redirects; conflicting saved/new sources; invalid usage and version; revocation between claim and dispatch; unchanged amount authority; changed payload identity. No open SDK lookups remain for this extension.

## Core 0.2.4 — standalone typed REST invoice and Payout observations

Scope: endpoints absent from the pinned APIMatic SDK resource map (Orders, Payments, Vault, Transaction Search, Subscriptions remain SDK-backed). This extension is explicitly REST, never represented as generated SDK coverage. The immutable 0.2.3 SDK adapter stays unchanged. Baseline: 84 core/SDK tests and strict TypeScript passed before edits.

Ground truth, retrieved 11 November 2026: https://developer.paypal.com/api/invoicing/v2/schema.json and https://developer.paypal.com/api/payments.payouts-batch/v1/schema.json . Private exact copies are in parent .setup-evidence/build-platform/paypal-{invoices,payouts}-schema.json. Runtime Node22 ESM, strict/exactOptionalPropertyTypes/verbatimModuleSyntax; follow provider.ts and canonical.ts for sandbox-only configuration and exact minor units. No dependencies added. Auth REST POST /v1/oauth2/token, Basic existing project client credentials, grant_type=client_credentials; cached short-lived bearer, no logging, no redirect following, whole-call abort bound. Only https://api-m.sandbox.paypal.com, existing SandboxConfig guard. All new request money is USD positive integer cents; observed zero fees/balances allowed. No retries hidden in transport.

### Endpoint contract (all lookups resolved)

| Operation | Method/path | Request fields and channel | Success/response |
|---|---|---|---|
| createInvoice | POST /v2/invoicing/invoices | JSON detail {invoice_number<=25,reference<=120,currency_code:USD}; invoicer.email_address controlled merchant; primary_recipients[0].billing_info.email_address controlled payer; items[{name<=200,quantity:"1",unit_amount:{currency_code,value}}]. Explicit configuration allow_tip:false and partial_payment.allow_partial_payment:false protects exact obligation. No future invoice_date, taxes, discounts, reminders or attachments. No undocumented Request-Id guarantee. | 201 invoice; exact id/status/number/reference/amount independently GET; response may be minimal link so follow only same-origin validated invoice ID. |
| getInvoice | GET /v2/invoicing/invoices/{invoice_id} | Encoded owned id path | 200 invoice; observe id/status/detail.invoice_number/reference/invoice_date/metadata.recipient_view_url,amount,due_amount,payments.transactions and refunds.transactions. |
| findInvoices | POST /v2/invoicing/search-invoices | exact invoice_number/reference JSON; page>=1,page_size100,total_required:true query | 200 invoices {items,total_pages,total_items}; paginate every page within bound, exact-filter both references, fail ambiguous/malformed pagination. Search is read-only despite POST. |
| sendInvoice | POST /v2/invoicing/invoices/{invoice_id}/send | JSON send_to_recipient:false,send_to_invoicer:false; no subject/note/additional recipients | 200 or202 link. Read current invoice first, require owned references and nonfuture invoice_date; docs say future scheduled date ignores notification suppression. Read invoice after response; SENT/SHARED never implies paid. |
| cancelInvoice | POST /v2/invoicing/invoices/{invoice_id}/cancel | JSON send_to_recipient:false,send_to_invoicer:false | 204, read current invoice to observe CANCELLED; never refund. |
| createPayout | POST /v1/payments/payouts | header PayPal-Request-Id stable from durable claim; JSON sender_batch_header.sender_batch_id<=256; items[{sender_item_id<=63,recipient_type EMAIL or PAYPAL_ID,receiver<=127,amount:{currency:USD,value}}]. Unique item IDs; no arbitrary notes/contact fields or Venmo/PHONE. | 201 batch_header {payout_batch_id,batch_status,sender_batch_header}. PENDING/PROCESSING/SUCCESS batch is not per-item payment. |
| getPayoutBatch | GET /v1/payments/payouts/{id} | path owned id; page>=1,page_size100,total_required:true query | 200 batch_header and items, total_pages/items. Read every page, reject duplicate IDs, mismatched batch/identity and inconsistent totals; no inferred completeness. |
| getPayoutItem | GET /v1/payments/payouts-item/{payout_item_id} | owned item path | 200 payout_item_id,payout_batch_id,transaction_id,transaction_status,payout_item {sender_item_id,recipient_type,receiver,amount},payout_item_fee,time_processed. Preserve actual states SUCCESS,FAILED,PENDING,UNCLAIMED,RETURNED,ONHOLD,BLOCKED,REFUNDED,REVERSED and unknown future status without treating it as success. |
| cancelUnclaimedPayout | POST /v1/payments/payouts-item/{id}/cancel | path only; no request body or undocumented headers | 200 payout_item; pre-read exact owned item UNCLAIMED, then call, returned RETURNED. |

Common documented errors: 400 invalid,401 auth,403 permissions,404 absent; invoice422 validation; payout500 uncertain; all other 5xx/network/read-decode errors uncertain after dispatch. Result union succeeded/refused/not_sent/unknown with bounded generic messages and safe correlation metadata, never raw payload free text. 408 classified unknown,429 explicit refused; token acquisition/config/validation/aborted-before-dispatch not_sent. 2xx malformed body is unknown. Preserve response status. A read failure is unknown observation and never a financial refusal.

### Durable writes and unknown outcomes

This is a low-level typed gateway, not a new PaymentCore action. Application adapters MUST persist immutable input/hash, current authority, exact eligible resources, recipient binding, expiry and committed stable external-operation claim before calling. Domain tests must observe the claim from inside transport. Domain writes recover using their own store after gateway returns; this gateway does not manufacture domain authorization or a success receipt. Concurrent gateway-only callers are not a durable executor. Existing PaymentCore action union is unchanged.

| Write | Claim/domain authority | Recovery |
|---|---|---|
| draft invoice | App unique current collection-round/obligation invoice intent; immutable unique number/reference | Immediate read-only exact number/reference search in catch; exact match with same amount/recipient resolves, zero/multiple/lookupfailure stays unknown. Never create another number after loss. |
| share/cancel invoice | App operation unique owned invoice + action, current round | Immediate getInvoice by same owned id after uncertain response. Caller accepts only expected state; a request acknowledgement alone is not settlement. |
| payout create | App unique approved claim/award settlement, sender_batch_id and every sender_item_id fixed, exact controlled/verified recipient + money | No GET by sender_batch_id exists. An explicit recovery may re-send byte-equivalent original request under same durable identity within 30 days; duplicate response link identifies original batch and is strict same-sandbox/path parsed. Never auto re-create after 30 days or swap batch. API docs explicitly allow same-ID5xxretry; transport itself performs no automatic replay. |
| payout cancel | App unique owned payout item cancellation; pre-read UNCLAIMED, same recipient/amount | Immediate read exact item after uncertain response, RETURNED observed separately. No new payout implied. |

Invoice payment type PAYPAL vs EXTERNAL is preserved independently of method. Each actual transaction ID and amount is retained. Invoice ID/status/paid_amount never substitutes for an economic payment. Invoice refund schema contains no original payment ID: originalPaymentId is null/unproved until domain corroborates external lineage. No record payment/refund endpoints included. Payout batch fees are estimates; exact per-item fee remains separately observed. Never expose receiver/raw invoice data publicly.

Conformance to add: exact wire fields/notification suppression; no hidden write retry; auth vs post-dispatch uncertainty; corrupt2xx; readonly search recovery; full pagination with malformed/drift/duplicate denial; exact identity/amount/recipient and cancel-state bounds; PAYPAL vs EXTERNAL transactions; batch vs item success; duplicate link validation; redaction. Live account preflight stored privately; local conformance never implies live capability. Future full app actor/authority/journal/worker tests remain lead-owned.
