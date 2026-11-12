# SDK identity and usage map

## Identity

| Fact | Value | Where to check |
|---|---|---|
| Package | `paypal` (not `@paypal/paypal-server-sdk`) | [`package.json`](../../package.json), `dependencies.paypal` |
| Version | 2.29.0, API spec 2.29, generator APIMatic | `node_modules/paypal/package.json` and the header table of `node_modules/paypal/sdk-map.md` after `npm ci` |
| Source | `github:context-plugins/paypal-typescript-sdk` at commit `5d0df8a8817e5fdf2e2cd48e68f790ea4730aab2` | `package.json`; `package-lock.json` entry `node_modules/paypal` |
| Client class | `PaypalClient`, resources `orders`, `payments`, `vault`, `transactionSearch`, `subscriptions` | `node_modules/paypal/sdk-map.md`, "Getting a client" |
| Resources used | `orders`, `payments`, `transactionSearch` | table below |
| Resources not used | `vault`, `subscriptions` | no call site in `packages/`, `apps/` or `scripts/` |

`@paypal/agent-toolkit` 1.11.0 is a different, PayPal-published package. It is used by the Errand fixture and the model's read-only investigation tools (`apps/fixtures/errand/`, `packages/ai/src/toolkit-read.ts`) and is not the APIMatic SDK.

## Client configuration

One place builds the client, [`packages/paypal-core/src/provider.ts:74-78`](../../packages/paypal-core/src/provider.ts#L74):

| Option | Value | Reason |
|---|---|---|
| `serverOptions.baseUrl` | `https://api-m.sandbox.paypal.com`, enforced by `assertSandboxConfig` ([`provider.ts:9-12`](../../packages/paypal-core/src/provider.ts#L9)) | The core refuses any other host, including production |
| `oauth2` | client ID and secret from server configuration | Client-credentials flow handled by the SDK |
| `retry` | `{maxRetries:0, timeout:15000}` | The SDK retries idempotent methods by default. A payment write must never be resent by a library, and a read retry would hide an unavailable provider from the reconciliation logic |
| `logging` | `{level:"off"}` | The SDK's request log would include the token request |
| `fetch` | injected in tests, default otherwise | The SDK's one transport seam; every wire test uses it |

Each call also receives an `AbortSignal` that combines the caller's signal with a 25 second deadline ([`provider.ts:79-83`](../../packages/paypal-core/src/provider.ts#L79)).

## Method map

All calls use `.asApiResult()`, so an HTTP error status is a value handled in one place. Writes always pass `payPalRequestId` (the stored provider request identity) and `prefer: "return=representation"` ([`provider.ts:111`](../../packages/paypal-core/src/provider.ts#L111)).

| SDK method | Purpose in the core | Call site | Executed wire test |
|---|---|---|---|
| `orders.createOrder` | Create the order for a purchase intent | [`provider.ts:121`](../../packages/paypal-core/src/provider.ts#L121) | [`tests/paypal-sdk.test.ts:21`](../../tests/paypal-sdk.test.ts#L21) |
| `orders.getOrder` | Read before capture or authorize; reread after an unknown outcome | [`provider.ts:104`](../../packages/paypal-core/src/provider.ts#L104), [`:125`](../../packages/paypal-core/src/provider.ts#L125) | [`tests/paypal-sdk.test.ts:167`](../../tests/paypal-sdk.test.ts#L167) |
| `orders.captureOrder` | Capture an approved order, empty JSON body | [`provider.ts:132`](../../packages/paypal-core/src/provider.ts#L132) | [`tests/paypal-sdk.test.ts:154`](../../tests/paypal-sdk.test.ts#L154) |
| `orders.authorizeOrder` | Authorize an approved order, empty JSON body | [`provider.ts:132`](../../packages/paypal-core/src/provider.ts#L132) | [`tests/paypal-sdk.test.ts:154`](../../tests/paypal-sdk.test.ts#L154), [`tests/contract-bindings.test.ts:79`](../../tests/contract-bindings.test.ts#L79) |
| `payments.getCapturedPayment` | Confirm a capture's status and amount | [`provider.ts:105`](../../packages/paypal-core/src/provider.ts#L105) | [`tests/paypal-sdk.test.ts:167`](../../tests/paypal-sdk.test.ts#L167) |
| `payments.getAuthorizedPayment` | Confirm an authorization; reread after a lost void or capture | [`provider.ts:106`](../../packages/paypal-core/src/provider.ts#L106) | [`tests/contract-bindings.test.ts:86`](../../tests/contract-bindings.test.ts#L86), [`:92`](../../tests/contract-bindings.test.ts#L92) |
| `payments.captureAuthorizedPayment` | Capture part or all of an authorization | [`provider.ts:138`](../../packages/paypal-core/src/provider.ts#L138) | [`tests/contract-bindings.test.ts:86`](../../tests/contract-bindings.test.ts#L86) (lost response only; the success path is in the live lifecycle receipt) |
| `payments.refundCapturedPayment` | Refund the duplicate capture, exact amount, `customId` set to the operation ID | [`provider.ts:144`](../../packages/paypal-core/src/provider.ts#L144) | [`tests/paypal-sdk.test.ts:214`](../../tests/paypal-sdk.test.ts#L214) |
| `payments.getRefund` | Confirm a refund | [`provider.ts:107`](../../packages/paypal-core/src/provider.ts#L107) | Not established at the wire: refund rereads are executed against a fixture provider at [`tests/paypal-core.test.ts:100`](../../tests/paypal-core.test.ts#L100), not through the SDK |
| `payments.voidPayment` | Void the remainder of an authorization | [`provider.ts:148`](../../packages/paypal-core/src/provider.ts#L148) | [`tests/contract-bindings.test.ts:92`](../../tests/contract-bindings.test.ts#L92) (lost response only; the success path is in the live lifecycle receipt) |
| `transactionSearch.searchTransactions` | Bounded, paginated history for an allowed set of IDs | [`provider.ts:185`](../../packages/paypal-core/src/provider.ts#L185) | [`tests/paypal-sdk.test.ts:197`](../../tests/paypal-sdk.test.ts#L197) |

Other call sites outside the core: `orders.getOrder` in the bounded live runner ([`packages/service/src/live-provider.ts:65`](../../packages/service/src/live-provider.ts#L65)), and `orders.createOrder` and `orders.getOrder` in the provider experiment runner ([`packages/provider-probes/src/runner.ts:44`](../../packages/provider-probes/src/runner.ts#L44), [`:53`](../../packages/provider-probes/src/runner.ts#L53)).

The live sandbox run of create, authorize, partial capture, void and refund through these methods is recorded in [`docs/evidence/paypal-lifecycle-qualification.json`](../evidence/paypal-lifecycle-qualification.json) (one isolated sandbox merchant, core 0.2.1).

## Error handling

The SDK's error family is translated once, in [`provider.ts:50-68`](../../packages/paypal-core/src/provider.ts#L50):

| SDK `kind` or status | Core outcome | Stored operation status | Executed test |
|---|---|---|---|
| `api` 401, 403 | rejected, answered 502 | `refused` | [`tests/contract-bindings.test.ts:58`](../../tests/contract-bindings.test.ts#L58) |
| `api` 429 | rejected, answered 503 | `refused` | [`tests/contract-bindings.test.ts:58`](../../tests/contract-bindings.test.ts#L58) |
| `api` other 4xx | rejected, same status, bounded reason code only | `refused` | [`tests/paypal-sdk.test.ts:187`](../../tests/paypal-sdk.test.ts#L187), [`:192`](../../tests/paypal-sdk.test.ts#L192) |
| `api` 5xx | unknown, answered 502 | `pending_reconciliation` | [`tests/contract-bindings.test.ts:63`](../../tests/contract-bindings.test.ts#L63) |
| `auth` | never sent | `not_sent` | [`tests/paypal-sdk.test.ts:182`](../../tests/paypal-sdk.test.ts#L182) |
| `encode` | never sent, no network request | `not_sent` | [`tests/contract-bindings.test.ts:113`](../../tests/contract-bindings.test.ts#L113) |
| `decode` on a 2xx | unknown, reconcile by reread | `succeeded` after reread, else `pending_reconciliation` | [`tests/paypal-sdk.test.ts:167`](../../tests/paypal-sdk.test.ts#L167) |
| unreadable 4xx body | rejected with the provider status | `refused` | [`tests/contract-bindings.test.ts:68`](../../tests/contract-bindings.test.ts#L68) |
| `connection`, `timeout` | unknown (never sent if the token request failed) | `pending_reconciliation` | [`tests/paypal-sdk.test.ts:167`](../../tests/paypal-sdk.test.ts#L167) for connection; the timeout arm is not driven through the SDK timer |
| anything else | rethrown | `pending_reconciliation` if already dispatched | [`tests/contract-bindings.test.ts:107`](../../tests/contract-bindings.test.ts#L107) |

Provider message text is never returned to a caller. Only an allow-listed issue code with a fixed sentence is ([`provider.ts:17-49`](../../packages/paypal-core/src/provider.ts#L17)).

## Where the SDK is not used

| Need | Why not the SDK | What is used instead |
|---|---|---|
| Webhook signature verification | The pinned SDK exposes no webhook operation | Direct REST postback, [`packages/paypal-core/src/webhook.ts`](../../packages/paypal-core/src/webhook.ts) |
| Invoices and payouts | Not in the pinned SDK's resource map | Typed REST gateway, [`packages/paypal-core/src/commerce-rest.ts`](../../packages/paypal-core/src/commerce-rest.ts), labelled as REST in the contract |
| Finding an order by request identity | The SDK has no such lookup | Nothing. A create whose response is lost stays pending until an order ID arrives through a durable receipt ([`tests/contract-bindings.test.ts:73`](../../tests/contract-bindings.test.ts#L73)) |

## Which core version runs where

| Consumer | Core it runs | Evidence |
|---|---|---|
| Web application, Bramble fixtures, `tests/application.test.ts` | Vendored archive `vendor/fracture-paypal-core-0.2.2.tgz`, imported as `@fracture/paypal-core` | `package.json`; archive SHA-256 recorded as `coreArchiveSha256` in [`application-conformance.json`](../evidence/application-conformance.json) |
| `tests/paypal-core.test.ts`, `tests/paypal-sdk.test.ts`, the plan-row tests in `tests/contract-bindings.test.ts` | Source tree `packages/paypal-core/src`, version 0.2.7 | [`packages/paypal-core/package.json`](../../packages/paypal-core/package.json); [`core-conformance.json`](../evidence/core-conformance.json) |

File and line references on this page and in `paypal-plan.md` name the 0.2.7 source tree. The SDK adapter in the 0.2.2 archive differs from it only by the first-purchase wallet-saving attribute added in 0.2.3 (three lines; compare `node_modules/@fracture/paypal-core/src/provider.ts` with `packages/paypal-core/src/provider.ts`). Versions 0.2.3 to 0.2.7 add wallet saving, invoices and payouts, which this application does not import. The application pin was not moved, so the conformance proof describes the archive the deployment actually runs.
