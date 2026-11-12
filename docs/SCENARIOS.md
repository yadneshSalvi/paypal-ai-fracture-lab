# Scenario catalogue

The catalogue defines 32 cases in `packages/scenarios/src/index.ts`. Each has one of three modes:

- **Sample** runs on click through `POST /api/runs`, the scenario studio, the CLI and MCP. It executes the real faulty or hardened Bramble target against the local provider model (`packages/runner/src/local-provider.ts`). No request reaches PayPal.
- **Recorded live** is a retained PayPal sandbox comparison. It is shown with its evidence and does not run on click, because every live run needs a person to approve each order.
- **Roadmap** is defined but not in this release. These cases appear only here and on `/limits`.

`ScenarioDTO.catalog` carries the mode as `"sample"`, `"recorded_live"` or `"roadmap"`. The exported `scenarios` list holds the Sample and recorded cases; `scenarioCatalogue` holds all 32; `roadmapScenarios` holds the rest.

The mode counts and the Sample outcomes below were measured by `npx tsx --test tests/scenario-catalogue.test.ts tests/application.test.ts tests/errand.test.ts` on SQLite and PostgreSQL. Test names are given without their `sqlite: ` or `postgres: ` prefix.

## Sample: 13 cases

All run against the local provider model with a scripted buyer. The baseline is `apps/fixtures/bramble/faulty.ts`; the control is `apps/fixtures/bramble/hardened.ts` on the pinned APIMatic SDK and the payment core. "Journey" executors live in `packages/scenarios/src/journeys.ts`, and the baseline's extra handlers in `packages/scenarios/src/specimens.ts`.

| Id | Title | Executor | Test (`tests/…`) | Invariants | Measured baseline / control |
| --- | --- | --- | --- | --- | --- |
| S0 | The payment succeeded. The answer vanished. | `executeRun`, fault `dropCaptureResponse`, customer retry | `application.test.ts`: S0 faulty retry creates two approved orders, control reconciles one | I1 I2 I3 I6 I7 I8 | 2 captures, $24, fail / 1 capture, pass |
| S3 | The reread is unavailable | `executeRun`, faults `dropCaptureResponse` + `unavailableReread` | `application.test.ts`: unavailable reread remains checking without another purchase | I1 I3 I6 I7 | control only: 1 capture, 0 entitlements, inconclusive |
| S4 | Authentication failed before dispatch | `executeRun`, fault `authFailure` | `application.test.ts`: never-sent authentication has no provider mutation or invented reconciliation | I1 I3 I7 | control only: 0 orders, 0 captures |
| S5 | Committed success, malformed body | `executeRun`, fault `malformedSuccess`, customer retry | `application.test.ts`: malformed success is reconciled by control and misreported by baseline | I1 I2 I3 I7 | 2 captures / 1 capture, paid |
| S10 | The lab's safety limit intervenes | `executeRun`, fault `policyDenial` | `application.test.ts`: harness safety intervention cannot count as target pass | I1 I2 I3 I7 | inconclusive / inconclusive, 0 captures |
| A4 | Pending capture is not a download | `executeRun`, fault `capturePending` | `application.test.ts`: pending capture cannot back fulfillment and does not become completed money | I3 I6 I7 | 1 unbacked entitlement, I3 fail / 0 entitlements, checking |
| A1 | The generic idempotency header trap | `executeRun`, fault `dropCaptureResponse`, customer retry; baseline wrapped by `withGenericIdempotencyKey` | `scenario-catalogue.test.ts`: A1 generic Idempotency-Key does not deduplicate, SDK PayPal-Request-Id does | I1 I2 I7 I8 | 4 writes with a generic key and no `PayPal-Request-Id`, 2 orders, 2 captures, fail / every write carries `PayPal-Request-Id`, 1 capture, pass |
| A2 | Same key, changed amount | journey `changedAmount`, fault `dropCaptureResponse` | `scenario-catalogue.test.ts`: A2 changed amount is captured twice by baseline and refused at the control's operation claim | I1 I2 I8 | captures of $12 and $15, I1 and I2 fail / changed payload refused before dispatch, 1 order create sent, 1 capture, pass |
| A7 | Duplicate durable job delivery | journey `duplicateJobDelivery` (two concurrent checkouts) | `scenario-catalogue.test.ts`: A7 duplicate job delivery buys twice on baseline and once on control | I1 I2 I3 I8 | 2 captures, 2 entitlements, fail / 1 order create sent, 1 capture, 1 entitlement, pass |
| S6 | Concurrent partial-refund requests | journey `concurrentPartialRefunds` (two $8 refunds race one $12 capture) | `scenario-catalogue.test.ts`: S6 racing partial refunds stay within the capture; only the control reserves before dispatch | I4 I8 | 2 refund requests sent, provider model refuses one, I4 pass, I8 fail / 1 refund request sent, the other refused by the reservation, I4 and I8 pass |
| S9 | Remediation authority was revoked | journey `revokedAuthority` (plan, revoke, dispatch) | `scenario-catalogue.test.ts`: S9 revoked approval still refunds on baseline and sends nothing on control | I4 I8 | $12 refund completed after revocation, I8 fail / 0 refund requests sent, pass |
| S1 | Forged capture webhook | journey `forgedWebhook`; control intake is `PaymentCore.ingestWebhook` with `PayPalWebhookVerifier` | `scenario-catalogue.test.ts`: S1 forged webhook fulfills on baseline and is rejected by the control's signature intake | I3 I5 | 1 entitlement with no capture, I3 and I5 fail / delivery stored unverified, 0 entitlements, pass |
| E0 | A tool loses its order answer | `executeErrand` (`apps/fixtures/errand/execute.ts`), fault `dropCreateResponse` | `errand.test.ts`: actual Toolkit baseline creates two orders, control recovers one, neither captures | E1 E2 | 2 orders / 1 order, no captures |

Limits of these Sample results:

- **A1.** The model ignores a generic `Idempotency-Key` because five matched create-order trials in PayPal sandbox recorded that behaviour (`docs/evidence/paypal-create-identity-qualification.json`, fact F9). Capture and refund were not probed. The run also measured that the pinned SDK sends its own generic `Idempotency-Key` on writes; only the explicit `PayPal-Request-Id` joined the retry.
- **S6.** The provider model refuses a refund that exceeds the capture, so I4 passes for both revisions. The difference is where the refusal happens. The baseline fails only I8.
- **S9.** None of the eight invariants is specific to authority. The unauthorized refund is recorded as the lab observation `refund_dispatched_after_revocation`; the failing invariant is I8.
- **S1.** The forged notice carries a certificate link outside PayPal's hosts, so the verifier rejects it before any postback. PayPal's verify-signature postback is not exercised.
- **A7.** Both workers run in one process. The baseline's two checkouts and the control's claim race are real; separate worker processes are not.

The campaign observatory at `/campaigns` keeps its six recipe cases (S0, S3, S4, S5, S10, A4), because fault-recipe reduction needs a declared recipe. The one-click sample campaign (`POST /api/campaigns`) admits all 12 Bramble Sample cases; `scenario-catalogue.test.ts`: "the one-click sample campaign admits every click-run Bramble case" ran them on the control with 0 failures.

## Recorded live: 1 case

| Id | Title | What was recorded | Evidence |
| --- | --- | --- | --- |
| L2 | A legitimate retry buys twice | 11 November 2026, isolated PayPal sandbox merchant, buyer-approved. Baseline: two distinct approved orders, two completed $12 captures, one entitlement, then a separate $12 refund of the second capture; verdict fail. Control: one order, one $12 capture, one entitlement; verdict pass. The lost answer was withheld locally after PayPal's real response. | `docs/evidence/live-bramble-qualification.json`, `docs/LIVE_BRAMBLE.md`, `/observations`, `/live-bramble` |

Both recorded runs carry scenario hash `cc468b63…e23c`, the hash of the L2 definition; `scenario-catalogue.test.ts` asserts the definition still hashes to it. Invariants named by the definition: I1 I2 I8. This is one approved comparison, not a rate.

## Roadmap: 18 cases

No executor and no test exists for these. The Sample run path refuses them with `SCENARIO_GATED` (`scenario-catalogue.test.ts`: roadmap and recorded cases are refused by the Sample run path).

| Id | Title | Invariants named | Why it is not in this release |
| --- | --- | --- | --- |
| L1 | Live capture, lost answer | I1 I3 I6 I7 | The live runner admits this single-order case, but no buyer-approved L1 pair was recorded; each run needs a fresh buyer approval. |
| L3 | Saved wallet, bounded consent | I1 I2 I8 | Needs a fresh saved-wallet consent; the one qualified $1 consent was consumed by its own trial. |
| L4 | One refund intent, two requests | I4 I8 | Needs a fresh live capture and a buyer-approved partial-refund authority for every run. |
| L5 | Authentic webhook resend | I3 I5 | Needs a provider-managed resend of a signed event to a registered receiver, which a click cannot trigger. |
| L6 | Natural redelivery after receiver failure | I3 I5 I6 | Needs PayPal's natural redelivery window after a real receiver failure; it cannot be compressed into a session. |
| L7 | Double onApprove callback | I1 I3 I8 | Needs a fresh browser checkout with instrumented approval callbacks and a buyer approval per run. |
| L8 | Errand loses an order answer | I8 | Live Errand with a model-driven agent is outside this release; E0 runs the installed Toolkit against the local provider model. |
| N1 | Instrument declined | I3 I7 | Needs a sandbox-native decline paired with a successful control on a fresh buyer approval. |
| N2 | Duplicate invoice identifier | I7 I8 | The exact duplicate-invoice refusal for this account was not recorded, so no local model of it is offered. |
| N3 | Authorization or capture refused | I3 I7 | The local provider models capture-intent orders only; a native authorization refusal was not recorded. |
| S2 | Held authentic events arrive out of order | I5 I6 | Needs authentic held webhook payloads to replay; none were retained, and invented payloads would not be a Replay. |
| S7 | Authorization expires on a virtual clock | I3 I7 | The local provider models capture-intent orders only; authorization lifecycles and their expiry are not modeled. |
| S8 | Worker crashes after provider success | I1 I3 I6 I8 | Needs a separately killable target process. The in-process Sample runner cannot honestly stop a worker mid-call. |
| S11 | A deceptive repair weakens the test | I8 | Shipped as a repair policy check rather than a payment run: the seeded deceptive patch is rejected in Repairs. |
| S12 | A repair tries to expose a secret | I8 | Shipped as a repair policy check rather than a payment run: every candidate patch is screened for secret reads and egress before it executes. |
| A3 | Cross-session resource access | I8 | The local provider model isolates each run's resources, so one session's capture cannot be reached from another run to stage this. |
| A5 | Pending refund keeps its reservation | I4 I8 | How a pending refund counts against capture capacity was not recorded from the provider, so the model would be a guess. |
| A6 | Cancel during an unknown outcome | I1 I6 I7 | Cancellation is a lab control on each run rather than a scripted paired case in this release. |

Related checks that exist outside the catalogue: the repair policy behind S11 and S12 is asserted by `application.test.ts`: "repair policy rejects weakened assertions and secret access before execution"; run ownership across sessions (near A3) by "session ownership, signed cookies, and immutable command payloads"; the lab's own interrupted worker (near S8) by "expired worker at dispatch boundary cannot blindly replay".
