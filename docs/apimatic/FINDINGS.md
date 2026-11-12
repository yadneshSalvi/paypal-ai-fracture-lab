# Findings: documented behaviour against observed behaviour

Each finding names its evidence class. **Live sandbox** means requests to PayPal's sandbox from an isolated merchant account, recorded as a redacted receipt. **Sample** means the real SDK against a local transport, with no request leaving the machine.

## 1. The SDK's `Idempotency-Key` does not deduplicate PayPal create-order

- **Documented.** The SDK map states that a fresh `Idempotency-Key` header is minted on every non-GET call, that no option sets it, and that it is "no substitute for a key the API documents" (`node_modules/paypal/sdk-map.md`, the "Idempotency-Key" row). PayPal documents `PayPal-Request-Id` as its request identity.
- **Observed, live sandbox.** Five matched trials, 40 create-order calls, each read back. Two calls with the same generic `Idempotency-Key` and no `PayPal-Request-Id` produced two orders in 5 of 5 trials. Two calls with the same `PayPal-Request-Id` produced one order in 5 of 5 trials. Receipt: [`docs/evidence/paypal-create-identity-qualification.json`](../evidence/paypal-create-identity-qualification.json) (`interpretation: "generic_header_did_not_deduplicate"`); method and limits: [`docs/provider-experiments.md`](../provider-experiments.md).
- **Consequence in code.** Every write passes the SDK's `payPalRequestId` field with an identity stored before dispatch ([`provider.ts:111`](../../packages/paypal-core/src/provider.ts#L111)). The header the SDK mints is still sent and is asserted present, but nothing relies on it ([`tests/paypal-sdk.test.ts:31`](../../tests/paypal-sdk.test.ts#L31)). Duplicate protection is the application's own unique claim.
- **Limits.** One endpoint, one sandbox merchant, short intervals between calls. This is not a defect in the SDK, which documents the header accurately. It shows that a header's name is not a provider guarantee.

This finding is the root of the demonstration: the faulty Bramble checkout retries a capture without a stable request identity and takes the customer's money twice.

## 2. Capture and authorize need a body the SDK marks optional

- **Documented.** `captureOrder` and `authorizeOrder` list `body` as not required (`node_modules/paypal/map/operations/orders.md`).
- **Observed, live sandbox.** Authorizing an approved order with the body omitted returned HTTP 415, because the SDK sends no `Content-Type` when there is no body. Receipt: `observedIssue` in [`docs/evidence/paypal-lifecycle-qualification.json`](../evidence/paypal-lifecycle-qualification.json).
- **Consequence in code.** Both calls send an empty typed body `{}` ([`provider.ts:130-132`](../../packages/paypal-core/src/provider.ts#L130)). Sample test asserting `Content-Type: application/json` and the body `{}`: [`tests/paypal-sdk.test.ts:154`](../../tests/paypal-sdk.test.ts#L154).

## 3. The SDK's negative-testing field behaves as documented

- **Documented.** The SDK exposes `payPalMockResponse`, sent as the `PayPal-Mock-Response` header (`node_modules/paypal/map/operations/orders.md`).
- **Observed, live sandbox.** 20 capture requests on 5 unapproved orders: each of three requested error codes and a native control returned HTTP 422 with the expected typed SDK error, and 40 follow-up reads showed no payment resource. Receipt: [`docs/evidence/paypal-negative-pairs-qualification.json`](../evidence/paypal-negative-pairs-qualification.json); method: [`docs/provider-negative.md`](../provider-negative.md).
- **Consequence in code.** The field is omitted from every product call and used only by that declared experiment (contract, OPTIONAL FIELDS section of [`paypal-plan.md`](../../paypal-plan.md)).

## 4. Retries are on by default and are turned off

- **Documented.** The SDK retries GET, HEAD, PUT and OPTIONS on 408, 429 and 5xx by default and never retries a POST (`node_modules/paypal/sdk-map.md`, `RetryOptions`).
- **Observed, Sample.** With `maxRetries: 0`, a 429 or 5xx on a write produces exactly one request ([`tests/contract-bindings.test.ts:58`](../../tests/contract-bindings.test.ts#L58), [`:63`](../../tests/contract-bindings.test.ts#L63)).
- **Consequence in code.** `retry:{maxRetries:0}` at [`provider.ts:76`](../../packages/paypal-core/src/provider.ts#L76). An unknown outcome is settled by a reread chosen by the payment core, not by the transport.

## 5. An invalid request model fails before any network request

- **Observed, Sample.** A request body that does not match the SDK's schema raises the SDK's `encode` error before the token request is made, so no call of any kind is sent ([`tests/contract-bindings.test.ts:113`](../../tests/contract-bindings.test.ts#L113)). The core records such an operation as never sent, which permits a corrected retry without a reread.

## 6. Transaction Search can omit its array

- **Observed.** The adapter accepts a first page with no `transactionDetails` array only when both totals are reported as zero, and rejects any other missing or contradictory pagination field ([`provider.ts:186-188`](../../packages/paypal-core/src/provider.ts#L186)). Sample tests: [`tests/paypal-sdk.test.ts:197`](../../tests/paypal-sdk.test.ts#L197).
- **Not established.** The source comment attributes the omitted array to new sandbox accounts. No public receipt in `docs/evidence/` records that live observation.

## 7. Capabilities the SDK does not have

No webhook verification, no invoice or payout resources, and no lookup of an order by request identity. The first two are implemented as separately labelled REST calls. The third is left unimplemented on purpose, so a create with a lost response stays pending rather than being guessed. See [SDK_USAGE.md](SDK_USAGE.md#where-the-sdk-is-not-used).

## What these findings do not establish

Nothing here is a production observation. The live receipts come from one isolated US sandbox merchant on 10 and 11 November 2026. Retention windows for `PayPal-Request-Id`, behaviour of capture and refund under the generic header, and other accounts or regions were not measured.
