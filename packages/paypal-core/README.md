# PayPal core 0.2.4

Portable server-only payment execution, tested first against Fracture Lab's hardened control. Never insert this core into an intentionally faulty target's request path. MIT licensed; no account provisioning or package publication is performed.

The SDK is `paypal` 2.29.0 pinned to `5d0df8a8817e5fdf2e2cd48e68f790ea4730aab2` in `context-plugins/paypal-typescript-sdk`. It is distinct from `@paypal/paypal-server-sdk`. No SDK source is vendored. `PROVENANCE.json` records exact implementation hashes and local conformance results; those tests make no live-provider claim.

## Build and portability

Copy the complete versioned package into the receiving repository, preserving its provenance and license. It has ordinary npm dependencies, no parent-workspace imports, and Node ESM output. Node 22 or later is required.

```sh
npm install
npm run build --prefix packages/paypal-core
npm run verify:core
```

The last command is supplied by Fracture Lab's root scripts. It executes the suite on file-backed SQLite and, when `DATABASE_URL` is configured, PostgreSQL; exercises the real pinned SDK with dummy fetch responses; builds the package; and writes `docs/evidence/core-conformance.json`. PostgreSQL is the authoritative deployment store. There is no process-memory store.

## Frozen interface

Public types are in `src/types.ts`; emitted declarations are in `dist/index.d.ts`. Import from the package root.

- `PaymentCore({store,provider,policy})`: `execute(command)`, explicit `retry(scope,operationId)`, `reconcile(scope,operationId)`, `recover(scope)`, `listReceipts(scope)`, and `ingestWebhook(scope,rawBody,headers,verifier)`.
- `SqlPaymentStore(db, options?)`: call `initialize()` during migration. Claims and transitions use SQL uniqueness, row locks, and versions. The `PaymentStore` adapter also exposes `reclaim` for safe retry with a fresh budget.
- `PostgresDatabase(connectionString)` and `SqliteDatabase(filePath)` implement `SqlDatabase`.
- `SandboxPayPalProvider(config)`: typed SDK writes, normalized resource reads, conservative reconciliation, and scoped Transaction Search. Config requires exact sandbox URL, credentials, and a project-isolation marker.
- `PayPalWebhookVerifier(config,registeredWebhookId)`: REST postback because this SDK has no webhook operation. Simulator placeholder IDs are rejected. Original event JSON is preserved; arbitrary certificate URLs are never downloaded.
- `payloadHash(action)`, `canonicalJson`, exact minor-unit money conversion, and redaction helpers.

Every `PaymentCommand` contains `scope:{tenantId,projectId}`, `operationId`, semantic `businessKey`, `intentId`, `providerRequestId`, immutable `payloadHash(action)`, typed `action`, and `approval:{id,version,digest,expiresAt}`. Repeated callbacks use the same semantic key. Changed payloads and provider-key reuse for another business operation are rejected. The typed SDK field sends `PayPal-Request-Id`; the SDK's generic `Idempotency-Key` is not substituted for it.

The domain implements `PaymentPolicy.authorize(command)` from current durable authority. Return `allowed`, `reason`, `resourceIds`, `currency`, `maximumMinor`, `approvalId`, `approvalVersion`, and **`approvalDigest`**. Checks occur before claim and again before dispatch. All relevant resource IDs must be granted. The domain owns authentication, approvals, payer consent, merchant ownership, and freshness. An unconditional allow is for isolated tests only.

Refund and authorization-capture grants require a fresh `reservation`:

```ts
{
  resourceKey: `capture:${captureId}`, // or authorization:<id>
  currency: 'USD', totalMinor: 1200, externallyConsumedMinor: 300,
  observedProviderIds: ['refund-id-already-in-that-300'],
  observedAt: new Date().toISOString()
}
```

The budget must derive from authoritative reads and complete ownership mapping. `observedProviderIds` names only effects already included in `externallyConsumedMinor`, avoiding duplicate accounting. Atomic claims add unmatched in-flight reservations. Pending and uncertain writes retain capacity. A capture's gross amount or status alone is not its remaining refundable balance. Version 0.1 does not discover a merchant's complete historical refunds for the domain.

## Outcomes and recovery

HTTP success is not completed money movement. Pending captures/refunds, missing resource fields, unavailable rereads, and uncorrelated effects remain `pending_reconciliation`. Definite denied states are `refused`. Authentication/encoding failures known to precede dispatch are `not_sent`. Unknown operations cannot use `retry`.

For `create_order`, `succeeded` means an order exists, not that money moved. Capture/refund actions also require the correct resource terminal state and exact amount. Drive commerce from the normalized resource kind/status, not operation status alone.

Claims commit before dispatch. Result-persistence failure leaves the committed `dispatching` record. A durable worker must schedule `recover(scope)`: expired dispatch leases and uncertainty receive reads, never blind writes. Failure after commit or in attempt logging leaves the canonical operation receipt recoverable. The package creates no background timer.

There is no invented lookup of orders by request ID. Lost create responses without a known order ID stay unknown. A lost refund ID needs an owning order exposing its `customId` correlation; aggregate amounts cannot prove an individual refund. Partial authorization capture also remains unknown without exact attribution. Do not clear these reservations simply to enable another write.

Webhook signature verification, supported minimal reference-envelope validation, and canonical-event deduplication are separate checks. All delivery attempts are retained. Unsupported/malformed verified envelopes and changed canonical payloads become dead letters. Intake never mutates commerce. Domain workers must reread the authoritative resource before a commerce transition.

## Qualification limits

Tests cover durable duplicate claims, changed payloads, refund races, pending/unknown/refused states, SQL failures around provider success, authority revocation, webhook rejection/deduplication/dead letters, exact money, and actual SDK request encoding with fixture responses. Evidence is **Sample**. No credentials or raw provider response bodies are emitted.

Authorization capture/void and Transaction Search have resolved typed implementations but require further endpoint-specific and real-account qualification before product claims. Tracking, disputes, payouts, vault, Toolkit tools, and subscription billing are separate extensions not supplied by 0.1.0. Each product needs its own live receipts, ownership policy, read-API authorization, durable recovery worker, and dead-letter review.

| Surface | Version 0.2.4 status |
|---|---|
| Orders create/get/capture | Present; single purchase unit, optional exact item breakdown, custom ID, CAPTURE/AUTHORIZE intent; local SDK wire tests |
| Orders return/cancel URLs, experience context, saved payment source | Present with exact current origin/consent grants and real-SDK fixture tests; approval UI and live qualification belong to the domain |
| Orders authorize; authorization read, partial capture, finalCapture, void | Typed implementation present; approved money and a locked authorization budget required; full provider lifecycle qualification pending |
| Capture read and partial refund | Present; exact cents, custom operation ID, current domain budget, pending-state handling |
| Refund read/correlation | Present; unknown ID without a matching owning-order refund remains unknown |
| Transaction Search | Present, read-only, bounded/paginated/scoped; entitlement and runtime qualification pending |
| Registered webhook signature postback/intake | Present; receiver route/registration and authentic delivery qualification belong to each app |
| Vault setup approval and payment-token acquisition | Domain-owned extension; checkout using an existing consent-bound wallet is supplied |
| Payouts and recipient payout authority | Typed REST transport below; current recipient authority, durable claims and accounting remain domain owned |
| Invoices | Typed REST draft/read/search/share-link/cancel transport below; payment attribution remains domain owned |
| Tracking and customer disputes/evidence | Absent |
| Subscriptions and Agent Toolkit tools | Absent |

The Guild must qualify partial captures and `finalCapture` against its authorization ownership and remaining balance. WorldKit and Fieldproof must obtain actual Vault consent/payment tokens before using saved-wallet checkout. Glasshouse tracking/disputes are also explicit follow-on work.

## 0.2 checkout source contract

Optional `create_order.experience` maps to the modern PayPal Wallet experience context. Supply returnUrl/cancelUrl, userAction (PAY_NOW or CONTINUE), shippingPreference (NO_SHIPPING or GET_FROM_FILE), and optional brandName/locale/landingPage. `policy.authorize` must return `checkoutOrigins` containing both exact URL origins. HTTPS is required except loopback development; credentials and fragments are rejected. Deprecated application_context is never emitted.

Optional `create_order.savedWallet` contains vaultId, consentId, consentVersion, consentDigest, paymentInitiator, usagePattern and usage (DERIVED or SUBSEQUENT). The policy must grant the vault ID in resourceIds and return `savedWalletConsent` with **all those exact fields** plus a future expiresAt. Revoked/changed consent must not be granted. DERIVED delegates prior-use classification to PayPal; SUBSEQUENT requires actual previous successful-use evidence in the domain. Setup tokens, payment-token acquisition and mandate UI are separate domain workflows.

Both structures enter the immutable action hash. Current consent/origin checks run before claim and immediately before dispatch. Consent identifiers stay internal and are not sent to PayPal. The provider receives only vault_id and the approved stored_credential metadata. PAYER_ACTION_REQUIRED is retained, with the provider's approval link; creating such an order still does not prove captured funds. Version 0.2 passed 58 local PostgreSQL/SQLite and SDK fixture conformance cases; this is not live wallet or financial qualification.

## 0.1.1 correction

The real sandbox empty-account Reporting response omits transaction_details while explicitly returning total_items=0 and total_pages=0. This case now returns an empty complete page; absent nonzero data, contradictory zero totals and wrong page identities remain unreadable. Caller-caused refusals preserve an allowlisted provider issue code and safe recovery copy while discarding arbitrary messages, field values and descriptions. Sources: https://developer.paypal.com/api/errors/overview/ and https://developer.paypal.com/api/handle-payment-failures/.40 conformance tests cover both changes. A separate live Guild empty-account read succeeded; no financial write qualification is implied.

## 0.2.1 live Orders correction

A real buyer-approved sandbox authorization returned HTTP415 when the optional SDK body was omitted. Orders authorize and capture now send the supported empty JSON body to ensure application/json without supplying a new source.60 local conformance tests pass, including exact headers/body for both operations. One isolated Fracture Lab account then completed: $12 authorization, $4 partial capture with finalCapture=false, void of the remaining authorization, and $4 refund. This evidence qualifies that observed flow only; other apps, finalCapture=true, saved-wallet consent, webhooks and concurrent failures still need their own runtime checks.

## 0.2.2 itemized checkout

`create_order.items` optionally supplies `CheckoutItem[]`: name, positive integer quantity, positive integer `unitAmount` in the order currency, and optional sku. This narrow adapter allows1–100items, quantities1–9999, names/SKUs1–127characters. The exact BigInt component sum must equal the approved order total. The SDK emits items and `amount.breakdown.item_total`; taxes, shipping and discounts are outside this contract. Every item enters the immutable payload hash. Refunds are capture-level; a domain records which component the amount compensates.

69 PostgreSQL/SQLite and actual-SDK fixture tests pass. A separate live Fracture sandbox create/get showed Admission35USD + Soundcheckperk15USD and50USDitemtotal; no buyer approval or charge occurred. This does not qualify Opening Night's80ticketcaptures or38refunds. See Fracture docs/evidence/paypal-itemized-order-qualification.json.

A separate Fracture saved-wallet probe completed actual setup approval, token exchange, current token ownership read, immediate1USDcapture during order creation and its full refund. Inspect creation receipts for captures before dispatching another operation. It qualifies only that controlled test, not a production mandate or another merchant's wallet.

## 0.2.3 explicit first-purchase saving

Optional `create_order.saveWalletOnSuccess` is `{consentId,consentVersion,consentDigest,usageType:"MERCHANT"}`. It requires buyer-present `experience`, approved redirect origins, and an exact, unexpired `policy.authorize().saveWalletConsent` containing those fields plus `expiresAt`. It cannot accompany `savedWallet`. Checks run before claim and immediately before dispatch; all fields enter the immutable action hash. The SDK emits only `payment_source.paypal.attributes.vault` with `store_in_vault:ON_SUCCESS` and `usage_type:MERCHANT` plus SDK defaults `customer_type:CONSUMER` and `permit_multiple_payment_tokens:false`. It never sends consent identifiers.

Vault/customer IDs remain absent from normalized core receipts. The domain must read its exact owned order after observed authorization/capture and validate/store actual token identity privately; missing or pending vault data cannot become a saved mandate. A creation success does not mean money moved or vaulting completed. Existing consent-bound `savedWallet` checkout remains a separate operation. Local SDK fixture tests do not establish live capability.

## 0.2.4 typed commerce REST and private operation storage

`SandboxCommerceRestGateway(config, fetch?)` supplies Invoicing v2 and Payouts v1 because the pinned APIMatic SDK has no controllers for those APIs. This is an explicitly separate typed REST transport, not a new `PaymentCore` action or an authority layer. It requires the same sandbox-only configuration, rejects redirects, bounds responses/timeouts, and never automatically retries a write. Every caller must durably claim its semantic operation and recheck current scope, recipient, amount, approval/version, merchant ownership and reservation **before** invoking a mutation. Persist the immutable request and result privately. Public DTOs must omit raw recipient addresses and identifiers.

- `createInvoice`, `getInvoice`, `findInvoices`, `sendInvoice`, `cancelInvoice`: exact invoice number and reference; create recovery searches and independently reads the original invoice. Sharing/cancellation suppresses merchant and recipient notifications. Future-dated invoices are rejected because provider notification semantics differ. An `UNPAID` shared invoice is not a payment; `PAID` is not sufficient payment evidence either. PAYPAL and EXTERNAL transaction types remain distinct. The invoice refund schema does not identify its original payment, so `originalPaymentId` is deliberately null and requires independent domain corroboration. No manual mark-paid or record-refund endpoints are exposed.
- `createPayout`, `getPayoutBatch`, `getPayoutItem`, `cancelUnclaimedPayout`: USD, one to100items, exact EMAIL or PAYPAL_ID receivers, stable sender batch/item IDs and PayPal-Request-Id. Creation or batchSUCCESS does not imply itemSUCCESS. Full batch reads verify all pagination, item identities and coherent batch state; duplicates resolve the original batch only after every item matches. Pending or unknown writes retain domain reservations. A domain may explicitly recover an unknown creation with its identical persisted batch inside PayPal's30day duplicate retention, never a new identity; this transport does not schedule that retry. Cancellation requires an exact current UNCLAIMED item and confirms RETURNED.

Results carry `outcome`, timestamp, HTTP status and debug ID; succeeded reads include their typed observations, while failures return safe generic codes. `not_sent` is known pre-dispatch, `refused` is a definite write4xx other than408, and uncertain responses remain `unknown`. The domain decides whether any observed provider state satisfies its business obligation. Read reconciliation may continue after a lost write response to establish the original outcome.

`SqlPaymentStore` optionally accepts `{operationDocumentCodec:{encode(plaintext,context),decode(ciphertext,context)}}`. Synchronous callbacks must implement authenticated encryption with independent associated data binding `context.scope.tenantId`, `context.scope.projectId` and `context.operationId`. SQL stores a versioned wrapper; decode context is reconstructed from independent row columns, and the opened operation must match row identity and payload hash. Unknown encodings, missing keys and codec failures fail closed with safe errors. Existing plaintext is backward readable and becomes encrypted on its next transition; this is **not** a bulk migration of historical rows. The app owns key lifecycle and historical re-encryption, and must protect its separate domain command table as well. Attempts and normalized webhook records are unchanged and must not contain saved-wallet secrets.

The conformance suite tests wire contracts, unknown response recovery, recipient binding, pagination, no duplicate writes, conditional storage encryption, key/context failures and durable reservation behavior. Separate `docs/evidence/paypal-commerce-rest-qualification.json` records the narrow actual controlled sandbox flow; the fixture conformance manifest remains labeled Sample. No product's collection, invoice payment, reimbursement or multi-recipient payout is qualified by this library test.

## 0.2.5 commerce webhook observation intake

`PaymentCore.ingestWebhook` also admits the documented `INVOICING.INVOICE` lifecycle events, `PAYMENT.PAYOUTSBATCH` events and `PAYMENT.PAYOUTS-ITEM` events. It recognizes `PAYMENT.CAPTURE.DECLINED` and refund `PENDING`/`FAILED` observations. Names are exact and case-sensitive: item success is `SUCCEEDED`, batch success is `SUCCESS`, payout cancellation is `CANCELED`, and invoice cancellation is `CANCELLED`.

Invoice identity is read from `resource.id` or the legacy `resource.invoice.id` envelope. Payout-item identity is `resource.payout_item_id`; batch identity is `resource.batch_header.payout_batch_id` or the direct `resource.payout_batch_id`. A generic `resource.id` is accepted only when all supplied identifiers agree. Missing, malformed, conflicting or link-only resource identities are quarantined. URLs in events are never followed by intake. The raw envelope is hashed but no payer contact fields or raw payload are copied into normalized delivery records.

Signature verification, schema admission, canonical deduplication and reconciliation are separate. Admission creates a queued **observation**, performs no resource read or financial mutation and changes no balance. An owned-resource worker must independently read and verify the expected resource before using it. In particular, an invoice `PAID` event can represent partial, pending or externally recorded money; a payout batch event does not establish any individual item's success. Out-of-order delivery must not roll back a later authoritative resource observation.

The 135-case conformance manifest covers accepted event families, resource extraction, conflicting IDs, false event names, invalid signatures, redacted delivery metadata, deduplication and absence of automatic financial side effects. These use fixture verifiers and are **not authentic PayPal delivery qualification**. Each application must register its receiver and qualify actual signed deliveries separately.

Primary contracts: [PayPal event names](https://developer.paypal.com/api/rest/webhooks/event-names/), [Invoicing webhooks](https://developer.paypal.com/api/invoicing/webhooks/), and [Payouts webhooks](https://developer.paypal.com/payouts/webhooks).
