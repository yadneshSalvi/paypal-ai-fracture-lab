# How Fracture Lab uses APIMatic

Fracture Lab tests a PayPal checkout for money bugs and repairs them. Two APIMatic artefacts carry that work: the **PayPal Context Plugin** (the skills an AI coding agent reads before writing SDK code) and the **APIMatic-generated `paypal` TypeScript SDK** (the only client the payment core uses for Orders, Payments and Transaction Search). Every statement in this folder points at a file in this repository so that it can be checked.

| Page | What it answers |
|---|---|
| [CONTEXT_PLUGIN.md](CONTEXT_PLUGIN.md) | Which plugin and version was installed, how its provenance is recorded, and which skill informed which piece of code |
| [SDK_USAGE.md](SDK_USAGE.md) | The SDK identity and the map of every SDK method the code calls, with file and line |
| [FINDINGS.md](FINDINGS.md) | Where behaviour documented by the SDK differed from what the PayPal sandbox or the SDK itself was observed to do |

## The chain from SDK call to proof

1. **Contract.** [`paypal-plan.md`](../../paypal-plan.md) was written from the plugin's skills and the SDK map that ships inside the installed package. It records, per operation, the request fields used, the reread after an unknown outcome, the cross-operation invariants and the answer to each provider error. Each binding cell names a source line and an executed test, or says "Not established" with the reason.
2. **Code.** [`packages/paypal-core/src/provider.ts`](../../packages/paypal-core/src/provider.ts) is the single adapter over the SDK. The fixed target of the demonstration, [`apps/fixtures/bramble/hardened.ts`](../../apps/fixtures/bramble/hardened.ts), reaches PayPal only through it.
3. **Contract rows.** [`packages/analysis/src/contract-bindings.ts`](../../packages/analysis/src/contract-bindings.ts) defines five rows. Each row ties one contract requirement to a line in `hardened.ts`, a named test in [`tests/application.test.ts`](../../tests/application.test.ts), a money invariant (I3, I7 or I8, evaluated in [`packages/invariants/src/index.ts`](../../packages/invariants/src/index.ts)) and a scenario. The source and test lines are found by searching the current files, so a row cannot point at code that no longer exists.
4. **Proof.** `npm run verify:app` runs the typecheck and the application and model tests, then writes [`docs/evidence/application-conformance.json`](../evidence/application-conformance.json) with the name and result of every test and the SHA-256 of the files it ran against.
5. **Display.** The `/contract-sheet` page shows a row as **verified** only when the eleven runtime files listed in `contractRuntimePaths` hash to the values in that proof and the row's named test passed on every database adapter in it. Otherwise the row shows **bound** (linked, not executed against these files). The row for optional SDK fields is bound by design: the application test does not assert optional request fields, so it is never shown as verified.

`npm run check:conformance` recomputes the eleven hashes without running a test and fails, naming the stale files, when the proof no longer matches. It runs in CI ([`.github/workflows/ci.yml`](../../.github/workflows/ci.yml)) and as the `prebuild` step of `npm run build`, so a deployment cannot be built from a tree whose proof is out of date.

## What the evidence is, and is not

- The conformance proof is **Sample** evidence. The tests run the real SDK and the real payment core against a local provider model; no request leaves the machine. It proves properties of the application, not of a PayPal account.
- Live sandbox observations are separate, separately labelled receipts under [`docs/evidence/`](../evidence/), described in [FINDINGS.md](FINDINGS.md).
- The web application runs the vendored archive `vendor/fracture-paypal-core-0.2.2.tgz` (pinned in [`package.json`](../../package.json)). The source tree under `packages/paypal-core/` is version 0.2.7, and `vendor/` also holds archives 0.2.3 to 0.2.7 that sibling projects consume. See [SDK_USAGE.md](SDK_USAGE.md#which-core-version-runs-where).
