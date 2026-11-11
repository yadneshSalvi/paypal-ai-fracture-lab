# Fracture Lab PayPal integration contract

## Context-study execution contract — 11 November 2026

This additive work uses only the exact create/get/capture/refund/get-refund contracts already resolved below. It changes no shared payment core, provider account or previous experiment. Payment traffic is offline Sample traffic; only the model gateway may contact OpenAI/Gemini. Real-credential payment probes are outside this study. The untouched TypeScript tree and seven synthetic protocol checks passed; those are infrastructure checks, not study outcomes.

SDK identities remain TypeScript paypal2.29.0 at5d0df8a8817e5fdf2e2cd48e68f790ea4730aab2 and Python paypal2.29 at143e57f2a3729d7df3727386b8c9ddf023d9a5df. TypeScript uses ESM/strict/exactOptionalPropertyTypes and PaypalClient. Python uses the synchronous PaypalClient in a bounded worker and closes it. Normal installed dependencies and the public transport seams encode actual SDK requests. Fixed fictional credentials, explicit sandbox base URL, retry0 and logging off apply. No real credential, hidden test or golden answer enters the runner image. All arms have identical compiled dependency/type access; generated Markdown maps are accessible only through their declared context bundle.

| Contract | Boundary | Qualification |
|---|---|---|
| DUPLICATE CLAIMS | Target-owned SQL unique table/key, separate from immutable provider observations; SQLITE_CONSTRAINT_UNIQUE caught; committed claim before dispatch | Concurrent invocations and new processes share the store; witness inspects claims at dispatch |
| UNKNOWN OUTCOMES | Exact known order/capture/refund GET; no lookup by request identity; absent original resource stays unknown | Lost/malformed/pending/unavailable-read and paired never-sent cases |
| CROSS-OPERATION INVARIANTS | Target checks owned intent/resource and immutable payload before claim; pending refund reservations hold capacity | Changed-payload, cross-intent, concurrency and missing-reference cases |
| OPTIONAL FIELDS | Exact task money/identity/intent; representation where needed; no payer/source fields | Independent observations retain actual headers; harness never supplies a missing key |
| WHEN THE API SAYS NO | Caller4xx/reason preserved; fixed credentials/quota/upstream messages; uncertainty differs from proven unsent | Actual SDK errors and decoding, not mocked client methods |

Twenty independent modules cover five families, two languages and development/held-out splits. Candidate edits are restricted to one source module. Frozen hashes and actual baseline/golden receipts precede inference. The anonymous grader receives candidate/task/source identities, not treatment labels. Hidden assertions stay outside the container. Containers have no network/host mounts/secrets, a read-only filesystem, nonroot UID, dropped capabilities and bounded resources/lifetime. All first submissions, provider errors and the single predeclared infrastructure retry are immutable.

Required reading: MUST load typescript-integrate-paypal, typescript-getting-started, typescript-client-initialization, typescript-error-handling, typescript-testing and authentication/calling-endpoints/models/configuration-resilience companions; MUST load their Python equivalents. Installed maps and this sheet override generic companion examples. Source/test bindings and execution receipts accompany the corpus before study freeze. No unresolved API lookup is introduced.

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


## Tandem Python integration contract — pinned independent worker

Recorded by the root integration owner on 11 November2026 after both current Bramble candidate jobs and isolated verifications completed. This contract gates the independent Python implementation. Existing Bramble proofs retain their original context digest; future generation binds the complete new context. No Python application behavior is claimed by this contract.

## Environment and host decision

Pinned distribution paypal 2.29, import root paypal, non-editable commit 143e57f2a3729d7df3727386b8c9ddf023d9a5df. Actual interpreter .artifacts/tandem-venv/bin/python is Python3.11.15. uv0.12.9, pytest9.2, mypy and Pydantic2.14.3 installed. Same-SHA sdk-map.md and operation maps are at this sibling source checkout because the wheel does not install them. Source reading, not runtime introspection, supplied the facts below. No Python project existed for a baseline; actual read-only smoke passes strict mypy and four real sandbox GETs, recorded in python-readonly-qualification.json. The existing TypeScript app passes its regression suites separately.

Sync PaypalClient is chosen once: the host is a bounded worker with synchronous JSON request/response messages, not an async Python server. Hold one client for the worker lifetime and close with a context manager. The TypeScript host supervises process deadline; Python timeout20 only bounds individual waits and does not establish a whole-call deadline. No async client in sync handlers. Local and cloud worker designs must preserve the same durable operation store via narrowly scoped messages; no general SQL or credentials enter the candidate process.

Constructor is keyword-only: PaypalClient(*, base_url=None, timeout=30.0, retry_options=None, custom_http_client=None, oauth2=None, oauth2_token_source=None). Configure base_url=https://api-m.sandbox.paypal.com explicitly, ClientCredentials(client_id,client_secret) via paypal.core, retry_options=0 and timeout20. Credentials are required by our boundary; the SDK otherwise permits unauthenticated construction. Sample transport uses explicitly fictional credentials and no network. Real reads use only the isolated Fracture configuration. All mutating endpoints stay Sample until a new explicitly scoped sandbox lifecycle is qualified; existing consumed purchase consents are never reused.

## Response, model and error contracts

Use with_raw_response for every operation. Success(payload,status_code,headers) or Failure(error,status_code,headers); header names lowercased. ApiError has error/status_code/headers; lazy token errors bypass raw operation mode. RawError has status_code/content and .text()/.json(), never expose those raw values publicly. The exact per-operation unions are recorded below. Preserve intended 400/404/409/422 refusal, provider401/403/429 as upstream problems rather than caller authentication errors, and distinguish genuine refusal from unknown transport/decode outcomes. ValidationError/ValueError bypass raw modes. Most success model fields are UNSET, so successful decoding is insufficient: explicitly check resource id, supported status, amount/currency and parent/intent linkage. Unknown enum strings are not success.

Custom HttpClient implements send(HttpRequest)->HttpResponse and close(); HttpRequest method/url/headers/body/timeout. JsonBody.value is a JSON-safe object and media_type is declared by SDK. HttpResponse exposes url/status_code/lowercase headers/read()/iter_bytes(chunk_size)/close(), read releases the connection and close is idempotent. send wraps no-response failures in TransportError(inner_exception); the SDK unwraps that after its retry boundary, so callers receive the underlying timeout/connection exception. Body read failures are not TransportError. Inspect httpx2 causes to distinguish ConnectError proven unsent from response-loss/ReadTimeout unknown; plain exceptions without proof remain unknown. Capture structured redacted traces before injected loss, never authorization headers or OAuth bodies.

Request models: OrderRequest requires intent and purchase_units; CheckoutPaymentIntent CAPTURE/AUTHORIZE. PurchaseUnitRequest requires amount; set custom_id/reference_id deliberately. AmountWithBreakdown and Money require currency_code/value strings. RefundRequest.amount/custom_id are UNSET unless supplied. CaptureRequest.amount is UNSET, final_capture defaults False and must be set deliberately; invoice/note/descriptor omitted unless required. OrderAuthorizeRequest and OrderCaptureRequest fields are optional UNSET; use typed empty body to produce JSON rather than accidentally omitting content type. No None for SDK Optional[T]=T|UnsetType. No wire aliases for these used field names. Narrow via isinstance(value,UnsetType) where required; frozen Pydantic values serialize with to_dict/to_json.

Response models: Order and OrderAuthorizeResponse id/status/purchase_units are UNSET unless provided. PurchaseUnit.payments -> PaymentCollection contains captures: OrdersCapture[], authorizations: AuthorizationWithAdditionalData[], refunds: Refund[], all optional UNSET. Capture entries id/status/amount/custom_id are optional; PaymentAuthorization additionally expiration_time and supplementary_data; CapturedPayment supplementary_data.related_ids may give order_id/authorization_id/capture_id. Related identifiers and Error.details are optional. Error requires name/message/debug_id; ErrorDetails requires issue and defaults location=body. Preserve each resource type, never interpret an order COMPLETED alone as paid.

OrderStatus members CREATED,SAVED,APPROVED,VOIDED,COMPLETED,PAYER_ACTION_REQUIRED. CaptureStatus COMPLETED,DECLINED,PARTIALLY_REFUNDED,PENDING,REFUNDED,FAILED. RefundStatus CANCELLED,FAILED,PENDING,COMPLETED. AuthorizationStatus CREATED,CAPTURED,DENIED,PARTIALLY_CAPTURED,VOIDED,PENDING; provider expiry is an observed timestamp, while virtual expiry remains explicitly Sample. Do not copy the generated CAPTURED docstring's anomalous amount explanation into business policy: enforce measured sums independently. Every enum is open; unrecognized string blocks favorable conclusions.

Unrequested fields: no payPalMockResponse, partner attribution, auth assertions, client metadata, payer/source credentials, supplementary overrides, note_to_payer or invoice_id unless an exact scenario calls for them. Prefer return=representation where full state is necessary, then independently reread. RequestOptions is not an invented header map. SDK-generated generic Idempotency-Key never replaces explicit stable pay_pal_request_id.

## Exact operations from same-SHA maps

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



## Tandem durable invariants and implementation bindings

Every hardened write follows durable claim → SDK call → record. The store owns unique tenant/run/business-operation identity plus immutable payload hash, original provider request ID and current approval version. Losing claims raise an explicit DuplicateClaim which the worker catches and returns the existing operation; no pre-read-only dedupe. Refusals release only according to explicit known-refusal policy; unknown dispatch retains protection. This is target application behavior, never silently imposed on the faulty target by the observer.

| Write | Claim / rejection | Unknown recovery | Where in code |
|---|---|---|---|
| create_order | durable unique purchase/create | supported known original order read only; otherwise unknown, no invented search-by-request-ID | `TandemStore.claim` → `HardenedTickets.execute` / `_dispatch` → `SdkGateway.create_order`; tested lost-create/no-invented-read and six-worker uniqueness |
| authorize_order | durable unique original order/authorize | get_order of same owned order and inspect its exact authorizations | `TandemStore.claim` → `HardenedTickets.execute` / `_dispatch` → `SdkGateway.authorize_order`; tested reserve→partial capture→void lifecycle |
| capture_order | durable unique intent capture | get_order original order, exact capture/amount/status | `TandemStore.claim` → `HardenedTickets.execute` / `_dispatch` → `SdkGateway.capture_order`; tested dropped response, malformed response, six-worker race and crash after frame11 |
| capture_authorized_payment | unique capture intent plus atomic authorization remainder reservation | known capture GET; parent authorization GET alone cannot prove the particular capture | `TandemStore.claim` atomic remainder → `HardenedTickets.execute` / `_dispatch` → `SdkGateway.capture_authorization`; tested partial capture and missing exact capture identity |
| refund_captured_payment | unique refund intent plus atomic refundable remainder reservation | known refund GET; capture balance change alone is not exact-operation proof | `TandemStore.claim` atomic remainder → `HardenedTickets.execute` / `_dispatch` → `SdkGateway.refund_capture`; tested two competing refunds, changed payload and lost-response reservation |
| void_payment | unique remaining-authorization release | get_authorized_payment same original id; VOIDED doesn't imply refund of captured funds | `TandemStore.claim` → `HardenedTickets.execute` / `_dispatch` → `SdkGateway.void_authorization` → `_recover` / `get_authorization`; tested actual empty204 plus original authorization GET |

Unknown operations with no supported exact lookup stay unknown; no re-POST merely to escape uncertainty. Always read the original authorization after void, including an empty or undecodable response. Preserve gross capture history after refunds. Successful partial capture consumes only captured amount; remaining authorization is separately released or expires. No paid ticket without exact completed capture. One semantic ticket entitlement across callback/restart races. Review/cancel/revoke checks occur immediately before dispatch. Pre-send authentication/encoding failures do not trigger financial reconciliation; actual response loss does. Pending capture doesn't fulfill; pending refund retains reservation. No cross-tenant resource access. Distinct signed webhook event identity/monotonic reducers are a separate adapter, not assumed in this SDK.

## Required reading completed before implementation

MUST load python-integrate-paypal, python-getting-started, python-client-initialization, python-authentication, python-calling-endpoints, python-models, python-error-handling, python-configuration-resilience and python-testing. Root read these companions and SDK maps/source. No event-stream or file operations are in this worker's scope. Runtime/model errors naming SDK types trigger a new targeted source lookup; do not guess replacements.

## Tests and capability gates

Meaningful SDK wire tests cover stable versus generic identity, body omission versus typed {}, defaults/UNSET, typed/Raw refusals, success decode failure, transport before/after dispatch, no SDK retries, exact resource linkage, read-only recovery and current authority. Concurrent claim/refund races and restart proofs use the actual durable app store; Python strict mypy plus pytest are required. Baseline and hardened invariants use the same provider observations without the harness repairing the baseline. Child process/environment/no-network isolation is a separately measured boundary. Hosted Python VM snapshot, complete fixture UI, actual ticket scenario execution, live write qualification and evaluation are not implemented by these planning notes.

All six listed write rows bind to actual code. `TandemStore.claim` catches PostgreSQL 23505 only after its transaction rolls back, verifies immutable payload, and reports DuplicateClaim to the Python target. Refused/not-sent reservations stop contributing to remainder while their history persists; no implicit resend is added. `tests/tandem.test.ts` executes 24 cases/subcases against isolated real PostgreSQL schemas and actual Python SDK workers. 58 Python SDK/protocol tests and strict mypy also pass. Cloud proof additionally binds this exact source to five offline VMs across three cases. These are Sample-provider domain results; they are not real-provider lifecycle proof or the 600-attempt study.

## Runtime and transport design resolved after actual host qualification

Vercel snapshot snap_EFcaBKBJJA5lJIp97fGgSxdwMfOv now contains Python3.11.15 and exact local dependency versions, including pinnedpaypal2.29. A nonroot candidate user cannot write the runtime or sudo. DNS/IP egress denial and absence of secret environment variables were measured. The parent can use installed Sandbox3.9.1 detached runCommand(stdin:true), command.logs(), serialized writeStdin() and closeStdin(); an actual ready→request→reply→request→reply exchange passed. Raw API transport errors after uncertain stdin delivery must never automatically resend a mutation frame. The same protocol can run over local child-process pipes. This runtime snapshot is an environment prerequisite only; it contains no Tandem application, frozen evaluator or provider credentials.

Planned worker: apps/fixtures/tandem/worker.py reads strictly bounded versioned JSON frames; sdk_adapter.py owns the long-lived pinned SDK with custom HttpClient. Target faulty.py and hardened.py independently decide their purchase operations. The parent bridge packages/tandem/src/bridge.ts fixes session/run scope and permits only typed operation claims, target-state writes, target-owned entitlement operations, authority reads and bounded Sample provider requests. No arbitrary SQL, filesystem path, URL or resource from another run can be requested. Source hash and worker version bind every invocation. The Python SDK still encodes real request channels; no hidden wrapper adds business identity to the faulty target.

Durability: target operation claims and provider-model state reside in separate app PostgreSQL tables. Each operation is committed before the parent acknowledges its frame; the frame request ID is separate from the business operation identity. A lost worker answer cannot lose an already recorded provider effect. A new worker resumes from saved target operations and performs exact read-only reconciliation; the provider observer does not fix the faulty target. Parent lease/deadline/current actor checks stop stale workers, while an uncertain remote frame leaves the originating operation pending. Authorization, capture and refund money remain separately recorded. This bridge requires meaningful concurrent/restart/partial-message tests before the UI can claim durable parity.

## 2026-11-11 — F9 bounded create-order header experiment

This extension uses only the already-resolved `orders.createOrder` and `orders.getOrder` contracts above. Installed 2.29.0 map was reread; no SDK or API lookup remains. Node22/ESM/strict project conventions and the existing 290-test/typecheck/build baseline apply. All nine named TypeScript skills were loaded in this conversation; integration/getting-started/map were refreshed for this extension. This is an owner CLI campaign, never a public judge write endpoint.

**Question:** for one isolated sandbox merchant and POST /v2/checkout/orders, does reusing only generic `Idempotency-Key` join two calls? Five matched trials each have four randomized arms: stable PayPal-Request-Id/changing generic; changing PayPal-Request-Id/changing generic; absent PayPal-Request-Id/stable generic; absent PayPal-Request-Id/changing generic. Each arm makes two independently claimed calls. The same minimal body is used throughout a trial: CAPTURE intent, one USD1.00 purchase unit, trial customId; no invoice ID, wallet, payer, approval, itemization, experience, authorization or capture. Up to40 create calls,40 unapproved orders, **zero captured funds**. Existing orders expire normally; no refund is needed. All outcomes, refusals and incomplete pairs remain in the denominator. Classification uses actual resource identity and independent GET, never HTTP status alone. A result concerns only this endpoint, account, SDK and measured short window; refund behavior and retention remain unqualified.

**Optional fields:** create payPalRequestId only in its two declared arms; generic header is explicitly controlled through ClientOptions.fetch solely for this experiment; prefer=return=representation for identity/status/amount observation; purchaseUnit.customId binds the trial. Other optional fields omitted, SDK defaults retained. GET uses only the owned observed id. Client uses explicit sandbox baseUrl, isolated merchant credentials, retry.maxRetries0, logging.off and25s signal. Transport forwards Request+signal, refuses all routes except OAuth, exact create and GET of campaign-owned IDs, records only allowlisted non-secret headers, and never records OAuth data. A copy of Request changes only the declared generic header; caller-provided PayPal-Request-Id remains exactly encoded by the SDK.

### DURABLE WRITES / DUPLICATE CLAIMS
| Write | Claim store | Duplicate refusal | Catch | Where |
|---|---|---|---|---|
| One preregistered create-call slot | PostgreSQL probe campaign + calls, UNIQUE(campaign_id,call_key) | Atomic insert conflict; immutable input hash must match | Read existing completed result; any uncertain/claimed slot stops without redispatch | ProbeStore.claim + ProbeRunner.call; tests/provider-probes.test.ts durable duplicate claims |

The campaign manifest and every call identity are frozen before any provider mutation. An advisory lock serializes a campaign; the unique call slot remains protection after process death. Different slots are intentional experimental calls, not operational retries. No caller can add a slot, change a key/body, call an arbitrary URL, or approve an order.

### UNKNOWN OUTCOMES
| Write | Reread | Reference | Where | Test |
|---|---|---|---|---|
| createOrder | getOrder when original response trace durably retained a valid order id; otherwise no supported search exists | Exact campaign-owned original id | ProbeRunner.call/readback | tests/provider-probes.test.ts lost create, malformed original success, never-sent credential refusal |

A connection/decode/cancel after dispatch remains unknown unless an original resource can be independently read. Unknown slots never release their claim or resend. Original-read recovery changes only observation state, never the experimental call. Without an id the campaign stops visibly; this documented capability limit is preserved, not guessed around. Auth/encode before create transport is not_sent, performs no resource reread, and remains in the original campaign. Other HTTP refusals are retained and stop the campaign; no automatic write retry.

### CROSS-OPERATION INVARIANTS
| Invariant | Legal set | Enforcement | Test |
|---|---|---|---|
| Only frozen call slots/body/headers | Immutable preregistered manifest hash | ProbeStore.claim + ProbeRunner transport | crossed slot and immutable manifest test |
| Only observed campaign resource IDs may be read | Saved create trace/result in that same campaign | ProbeRunner transport + ProbeStore.owns | failed original read / no invented lookup tests |
| No financial operation | Exact method/route allowlist and no wallet/payer in frozen body | ProbeRunner transport and validateManifest | exact actual SDK wire/body campaign test |
| All repeated-observation claims need5 complete matched trials | Forty slots plus independent GETs and trace validation | probeReport | matched campaign, contrary outcome and unqualified positive-control tests |

### WHEN THE API SAYS NO
Create error arms and GET error arms are the exact tables above. Persist status and allowlisted provider reason from the correctly narrowed operation result; omit personal fields and credential payloads. Operator reports distinguish refused, not_sent, unknown and verified. Credentials/401/403 use fixed credential failure;429 fixed quota failure;5xx fixed provider unavailable. Unknown non-family exceptions remain application errors; state is conservatively retained before rethrow. Nothing maps an absent response to a conclusive provider refusal.

**Required reading:** MUST load typescript-integrate-paypal, typescript-getting-started, typescript-error-handling, typescript-client-initialization, typescript-authentication, typescript-calling-endpoints, typescript-models, typescript-configuration-resilience, typescript-testing — all previously loaded; exact current operation map and this extension reread before implementation. Release replaces each TBD with the implemented source/test binding and executed hash evidence.

Implementation binding:12 meaningful real-SDK/PostgreSQL fixture tests pass on2026-11-11; isolated disposable schemas only, no provider traffic. The transport uses FetchLike=typeof fetch, narrows its actual Request and reads forwarded.clone() after preserving signal; this fixes a locally observed consumed-body test failure before any sandbox dispatch. Live campaign ef2bb79f-e6bc-472e-9307-9bd0e70fabd3 subsequently verified40/40 calls and20 pairs: same proper header returned one order, same generic-only header returned two, across five matched trials. The safe record and exact scope are in docs/evidence/paypal-create-identity-qualification.json.

## F4 authentic delivery observation — reviewed REST contract, 2026-11-11

This work adds a signature-verified observer to the stable project callback. It does not change the frozen application SDK or claim that an observed event proves a target fulfillment. The installed `paypal` map has no webhooks resource; this is the explicit REST exception already used by `@fracture/paypal-core@0.2.2`'s public `PayPalWebhookVerifier`.

- Exact constructor: `new PayPalWebhookVerifier(config: SandboxConfig, webhookId: string, transport?: typeof fetch)`; `verify(rawBody: string, headers: Headers): Promise<{verified:boolean;transmissionId:string}>`. SandboxConfig has `environment:'sandbox'`, `baseUrl`, `clientId`, `clientSecret`, `isolatedProject`; existing core enforces sandbox/project isolation. No SDK member or deep import is introduced.
- OAuth POST `/v1/oauth2/token`, Basic client credentials, form `grant_type=client_credentials`, 15s bounded timeout. Verification POST `/v1/notifications/verify-webhook-signature`, Bearer token, JSON fields `transmission_id`, `transmission_time`, `cert_url`, `auth_algo`, `transmission_sig`, `webhook_id`, `webhook_event`. Exact original event JSON bytes enter the postback body. Only `verification_status:'SUCCESS'` admits an event. Missing/invalid headers or failure are rejected; provider/network failure remains unverified and returns503. Only the two fixed sandbox routes are allowed, redirects denied and no automatic write retries.
- Incoming body ≤256KiB; five original PayPal headers bounded, exact raw bytes retained encrypted at rest using a domain-separated key derived from the existing private session secret. Signature-verification receipt hashes exclude OAuth credentials. Each intake has its own UUID/transmission record before verification; `(merchantFingerprint,webhookId,eventId)` admits one canonical event. Changed body for an existing verified identity is quarantined; it cannot overwrite the original. No payment or target fulfillment is performed by this intake.
- Owner-only CLI/maintenance registration uses official REST webhook management: GET/POST `/v1/notifications/webhooks`; POST body `{url,event_types:[{name}]}`; id and exact stable URL retained. Event search/detail and resend use documented `/v1/notifications/webhooks-events`; resend `{webhook_ids:[registeredId]}` is an explicit probe request, not proof of delivery. Runtime never exposes these mutations to a judge.
- A separately armed, expiring, exact-order/type rule may return one500 after a verified observation commits. Rule consumption is atomic with canonical admission. Subsequent authentic deliveries are retained and acknowledged, with no repeated canonical effect. This is labeled a receiver experiment, not an application fulfillment regression. A timeout without a new verified transmission is inconclusive. Stored-event replay is separately labeled and cannot count as a new provider delivery.
- Meaningful checks: actual public core postback payload/hash boundary, forged/missing signature, provider outage, concurrent repeated authentic-fixture deliveries, conflicting event bytes, encrypted raw evidence, key mismatch, exact order/type/expiry matching, commit-before500 rule and duplicate recovery, strict bounded HTTP intake. Tests use controlled responses and remain Sample; authentic provider qualification requires the stable deployment and real delivery.

Sources retrieved 2026-11-11: https://developer.paypal.com/api/rest/webhooks/rest/ and https://developer.paypal.com/api/webhooks/v1. The former documents up to25 redeliveries over3days after non2xx and simulator incompatibility with postback verification; neither is an observed timing guarantee for our campaign. Implementation lookup complete; no open SDK lookup.

### F4 delivery-qualification orders (owner-only, no capture)

Prepare six separate USD1.00 CAPTURE-intent orders: five authentic-resend pairs and one independent natural-redelivery observation. These are approval-only source resources, never the frozen F9 orders. The experiment transport allows OAuth, one create per frozen slot and GET of its observed order only. It cannot call authorize, capture, refund or Vault. No wallet is saved and no financial effect is initiated.

Exact additional type lookup from installed src/models/order-request.ts → payment-source.ts → pay-pal-wallet.ts → pay-pal-wallet-experience-context.ts: `OrderRequest.paymentSource?:PaymentSource`; `PaymentSource.paypal?:PayPalWallet`; `PayPalWallet.experienceContext?:PayPalWalletExperienceContext`. Optional body members `brandName`→brand_name, `returnUrl`→return_url, `cancelUrl`→cancel_url, `shippingPreference`→shipping_preference (`NO_SHIPPING` selected, defaultGET_FROM_FILE), `userAction`→user_action (`CONTINUE` selected/default; otherPAY_NOW). Other defaulted optional context fields are contactPreferenceNO_CONTACT_INFO, landingPageNO_PREFERENCE and paymentMethodPreferenceUNRESTRICTED; no nullable field in this path. Original serialized wire body is frozen using the installed SDK against a declared fake transport before any live dispatch. Return/cancel target is the stable facts page. Scope does not use processingInstruction, saved credentials, vault attributes, payer identity or shipment.

Create/get signatures, error arms, request headers, sandbox host and retry/logging configuration remain the F9 exact lookup above. Persist each dispatch before sending, retain original raw response/observed ID before decoding, verify original order independently, and never re-POST an unresolved slot. A provider APPROVED state is not a capture or an authorization. Actual signed delivery receipt, resend request and natural retry observation are separate evidence types.

## F5 endpoint-specific negative-response qualification — 11 November 2026

This additive owner campaign uses the existing pinned TypeScript SDK and the fully resolved createOrder/getOrder/captureOrder contracts above. It does not alter Bramble's frozen fixture contract. Official sources read today: https://developer.paypal.com/negative-testing/request-headers and https://developer.paypal.com/api/orders/v2/error-messages (Capture order). All nine named TypeScript companion skills were loaded for this implementation; installed sdk-map, Orders operation map, resources/orders.ts and existing error/model contracts are the lookup authorities.

`captureOrder({id,body:{},payPalRequestId,prefer:'return=representation',payPalMockResponse})` maps the optional string `payPalMockResponse` to `PayPal-Mock-Response`. The value is JSON containing exactly `mock_application_codes`. It is absent on the native control. Native SDK-generated generic identity does not replace the explicit UUID. No payment source, approval, wallet or invoice is supplied. The selected code pairs are N1 `INSTRUMENT_DECLINED`, N2 `DUPLICATE_INVOICE_ID`, N3 `PAYER_CANNOT_PAY`, all at POST `/v2/checkout/orders/{id}/capture`. A documented error is only a proposed pair until the provider actually returns it.

Five new USD1 unapproved CAPTURE orders each receive one native control and three preregistered mock requests, with separately frozen stable request UUIDs. Every attempt has independent original-order GET before and after it; any approved state, payment resource, unexpected success, transport uncertainty, mismatched issue or credential problem stops dispatch. The native control must establish `ORDER_NOT_APPROVED`; mock trials may only establish error-injection compatibility on this explicitly unapproved state. They do not establish an approved-payer decline, real insufficient funds, invoice uniqueness enforcement, or a complete application negative suite. No approved resource from another campaign is reused. No capture succeeds and no cleanup refund is expected; any unexpected effect is retained and stops the campaign for reconciliation.

| Binding | Owner / enforcement | Evidence |
|---|---|---|
| DUPLICATE CLAIMS | Exclusive campaign file lock plus atomic fsync state; every immutable slot moves ready → dispatching before transport, and can be sent at most once | Private `.artifacts/qualify-negative-pairs.mts`, original campaign manifest/source hash and wire hashes |
| UNKNOWN OUTCOMES | Unknown create without original ID never redispatches; known original order is read using getOrder, with no inferred search-by-key | Same helper; GET only exact saved campaign order IDs; incomplete slots remain incomplete |
| CROSS-OPERATION INVARIANTS | Exact sandbox origin, frozen merchant fingerprint, method/path/header/body allowlist, fresh CREATED/no-payment GET before each attempt; no payer approval or payment source | Bound private call/readback records; public reducer rejects altered controls, missing trials and effect-bearing reads |
| WHEN THE API SAYS NO | Orders.CaptureOrderError, arms error400/error2 401/error3 403/error4 404/error5 422/error6 500/error7 default/undeclared retain their distinction. Only typed error5 + 422 + exact issue qualifies a selected refusal. Other errors are recorded, not silently mapped to success | Original private raw body/status/hash and safe exported issue; no blanket retry |

Implementation binding: the original frozen owner campaign completed 5 creates, 20 exact expected typed422 refusals and 40 original-resource readbacks. All orders remained CREATED with zero approvals, authorizations, captures or refunds. `packages/provider-probes/src/negative.ts` derives F5 from the bound public report; `tests/provider-negative-fact.test.ts` supplies seven report-adversary/real-SDK wire checks. The complete331-test suite, strict typecheck and production build passed on11November2026. The first synthetic error fixture omitted required debug_id and was corrected; its failed result remains in private test evidence. Actual provider records were unchanged. Application N1–N3 execution remains separately unqualified.

## Live Bramble browser-approved runner — 11 November 2026

This unit binds existing create/get/capture/getCapturedPayment/refund contracts to L1/L2 and separate historical compensation. The source remains sandbox-only and uses the existing pinned installed core0.2.2; canonical shared core is unchanged. No saved-wallet authority is invented; L3 remains gated. No automatic browser approval, new payer identity, or simulated approval is permitted. The selected controlled buyer uses the actual PayPal checkout UI for each original order.

Implementation ownership: packages/service/src/live-bramble.ts, packages/service/src/live-provider.ts, tests/live-bramble.test.ts, dedicated API and UI. Source hashes identify these browser-continuable target phases separately from the frozen Sample fixture. The faulty target continues raw HTTP without PayPal-Request-Id, and its response loss still becomes a false financial failure. Lab dispatch claims only prevent accidental repeated execution of one browser step; they do not deduplicate separate faulty purchase attempts or add a request header. Hardened commands use the existing PaymentCore and original business identity.

The live provider seam calls the pinned SandboxPayPalProvider for typed reads, hardened writes, and compensation. The faulty raw requests use precisely the existing Orders wire bodies from faulty.ts and the create/capture maps above, authenticated against the same fixed sandbox host. OAuth tokens are private, cached server-side and excluded from records. Return values are reduced to allowlisted resource IDs/status/amounts and hashes; raw payer details are never public. Full-source code and contract references accompany every run.

DUPLICATE CLAIMS: lab_live_attempts PRIMARY KEY(run_id,attempt) freezes the original create/capture UUIDs, exact known order, and dispatch state before network. A repeated callback returns current recorded state; changed order or attempt is denied. Run/session rows and global capacity lock serialize claims. No transaction holds a network call. A crash at creating/capturing retains uncertain state and permits only reads of a known original resource. A second order is admitted only as the deliberate faulty L2 customer retry, under the same purchase intent, with a new legitimate payer approval. Hardened PaymentCore additionally claims semantic intent in paycore_operations.

UNKNOWN OUTCOMES: a lost capture answer is recorded after a real upstream capture observation; the response is withheld from the target. Faulty target reports failed without a read. Hardened target retains checking, rereads the original order/capture through the pinned provider and fulfills once only after COMPLETED. Lab observations may know more than the faulty target; event projections distinguish them. Unknown create with no resource ID never auto-retries or invents lookup. Known refused/auth/encode/never-sent outcomes remain distinct. Current PayPal approval and exact USD12 amount are checked before every capture.

CROSS-OPERATION: session cookie/expiry, current run authority, exact attempt/order, no cancel, immutable amount12USD; at most6 potentially dispatched captures/$72 per rolling hour per session, one active experiment/session and3 concurrent provider actions globally. Unknown reservations count against the limit. Every actual capture resource retains gross history; refunding the extra12 never changes the duplicate verdict. Refund command uses the existing deterministic operation identity, fresh exact capture read, remaining amount minus observed refunds/reservations, and separate explicit operator action.

Refusals and errors follow the existing WHEN THE API SAYS NO table. Tests will bind SQL claim-before-network, concurrent callbacks, wrong-session/order, current cancellation/expiry, amount/status checks, exact raw absent-vs-hardened stable header, dropped-response order/capture readback, never-sent absence of reads, unknown-create nonretry, rolling limits, and compensation history. Controlled wire tests qualify application behavior; actual checkout and resource reads are separately required before live claims/deployment. No new API lookup remains open in this unit.


Live runner implementation addendum: browser checkout uses the official v5 Buttons surface, intentionally matching the already-qualified portfolio flow. Official sources read on 11 November 2026: https://developer.paypal.com/v5/checkout/handle-funding-failure/ and https://developer.paypal.com/platforms/checkout/apm/reference/js-sdk-params-payment-fields/ . The current v6 reference and migration were inspected separately; v6 is not silently substituted into this integration. Client callbacks carry the frozen attempt number and original order ID; a repeated first callback cannot initiate attempt two.

The source fingerprint is rechecked before writes; run expiration, cancellation or changed code prevents new capture dispatch. Fulfillment commits under the run lock with a fresh authority check. Read-only reconciliation remains available for an owned original after expiry/cancellation and never resends an ambiguous payment. It can fulfill only the hardened target under current authority; it never repairs the faulty target using privileged lab observations. Pending capture cannot release a book.

Compensation is a separate explicit USD12 approval for the second capture only, stored in lab_live_refunds before any provider call. A fresh capture GET must still show the exact original COMPLETED/unrefunded USD12 resource. Partial/external refunds fail closed. Paycore's atomic resource reservation and deterministic business/operation identity prevent over-refund and concurrent duplicates; application callbacks reuse the original command and reconcile only. This compensation authorization has its own one-hour expiry within the current session and does not revive checkout authority. Its completed refund keeps the original $24 gross history and failed duplicate invariant. Lost/refused outcomes retain the original operation. No automatic retry is introduced.


Browser qualification found the in-app browser does not expose the v5 approval popup; the first original unapproved order is retained and its experiment cancelled with $0 captured. Add the documented HATEOAS approval redirect as an explicit same-tab alternative, keeping official Buttons available. Order.links[].href/rel are required strings and method is optional (installed link-description.ts); return only rel approve/payer-action with GET/omitted method, fixed https://www.sandbox.paypal.com host and exact original token. No URL is guessed. The existing fully resolved payment_source.paypal.experience_context contract supplies NO_SHIPPING/PAY_NOW/brand plus return/cancel origins from exact configured APP_URL, exact VERCEL_URL or localhost:4104/127.0.0.1:4104. The pinned core checkoutOrigins decision enforces the same set. The original attempt freezes its origin before creation. Returning merely reloads the saved run; a visible Finish approved purchase action rereads PayPal approval/amount/intent before capture. A query string never proves approval. Official source inspected: https://developer.paypal.com/sdk/orders/v2/definitions/order/ and https://developer.paypal.com/whats-an-order/ . No new operation or unresolved model lookup is introduced.
