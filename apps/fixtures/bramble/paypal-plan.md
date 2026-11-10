# Bramble Books payment contract

This curated fictional fixture has two separate targets. `faulty.ts` deliberately omits business-intent claims and reports unknown responses as failures. The recorder must preserve those omissions. `hardened.ts` uses the pinned APIMatic `paypal` SDK through `@fracture/paypal-core` and a durable intent claim. Both use the same local provider model for Sample runs; neither makes a real payment during local tests.

The source package is `paypal` 2.29.0, commit `5d0df8a8817e5fdf2e2cd48e68f790ea4730aab2`. The root `paypal-plan.md` resolves signatures, request channels, wire names, defaults, error families, enum values, optional-field choices, and referenced model declarations. Installed integration/getting-started/client-initialization/authentication/calling-endpoints/models/error-handling/configuration-resilience/testing skills were read before the shared adapter and this fixture. No new SDK operation is introduced here.

| Operation | Call and request | Required response | Optional fields |
|---|---|---|---|
| Create | `orders.createOrder({body:{intent:CAPTURE,purchaseUnits:[{amount,customId}]},payPalRequestId,prefer:'return=representation'})` | Order ID and status | No experience/payment source for the local model |
| Capture | `orders.captureOrder({id,body:{},payPalRequestId,prefer:'return=representation'})` | Named capture, status, exact amount/currency | The supported empty body establishes JSON content type |
| Read | `orders.getOrder({id})`, `payments.getCapturedPayment({captureId})` | Resource ID/status; amount on captures | No unnecessary payer fields |
| Compensate | `payments.refundCapturedPayment({captureId,body:{amount,customId},payPalRequestId,prefer:'return=representation'})` | Refund ID/status and exact amount | Explicit approval for the duplicate; current remaining balance |

## DUPLICATE CLAIMS

Hardened create and capture use `paycore_operations` unique scoped business keys, immutable payload hashes and stored provider request IDs. `SqlPaymentStore.claim` catches PostgreSQL 23505 / SQLite constraint conflicts and returns the winning operation. A scoped fulfillment entitlement is unique in `lab_fulfillments`. The faulty target never passes through this core.

## UNKNOWN OUTCOMES

The hardened target records checking before reading its original order and capture. No second create/capture follows a lost response. Missing/failed rereads keep pending reconciliation. Never-sent authentication/encoding failures are distinct. Unknown create without an ID stays unknown. Test bindings are added only after scenario tests execute.

## CROSS-OPERATION INVARIANTS

One purchase intent allows one capture up to USD12 and one fulfillment. Fulfillment requires a completed capture. Historical captures remain facts after compensation. Refund authority names the exact duplicate capture, amount, immutable digest and current balance. Actor state, provider resources, and lab observations are separate stores.

## OPTIONAL FIELDS AND REFUSALS

Only amount, custom identity, stable provider request identity and representation preference are supplied. No generic SDK idempotency header is treated as provider protection. Definite 4xx errors remain refusals; dropped connections and malformed successful responses are unknown; non-provider bugs propagate. Explicit logging is off. Sample credentials are dummy literals and the injected fetch has no network path.

## Evidence

The provider model records its resource before dropping the response. This proves the local application property, not PayPal account capability. Live-resource cases use separately approved sandbox flows and separately labelled receipts. `DEFECTS.md` explains the deliberate errors. Runtime source/test hashes determine bound versus verified UI rows.
