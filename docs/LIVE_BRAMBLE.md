# Live Bramble checkout

The `/live-bramble` page executes a bounded lost-response experiment against an isolated PayPal sandbox merchant. Preparing a run creates no payment. The intentionally faulty raw-HTTP target has no hidden payment-core deduplication; the hardened control uses the pinned APIMatic SDK through the durable core.

## Setup and journey

Set `FRACTURE_LIVE_BRAMBLE=1` along with the isolated sandbox credentials and the existing database/session configuration in `.env.example`. Credentials stay server-side. The public client ID is used only by PayPal's official JavaScript SDK. The configured application origin and the exact Vercel deployment origin are accepted return destinations; local development uses port 4104.

1. Prepare the baseline and open official PayPal sandbox checkout. If the browser cannot expose its popup, use **Continue on PayPal in this tab**. This follows the original order's provider-returned approval URL, never an invented approval link.
2. Approve the $12 order on PayPal. The same-tab return offers **Finish approved purchase**, which independently checks the exact order, intent, amount and approved state before capture.
3. The lab observes the real completed capture and then withholds its response from the faulty target. The shop incorrectly reports failure. An explicit customer retry creates a second order for the same business intent, requiring a separate PayPal approval.
4. The lab displays both completed captures and one download entitlement. Review the separate $12 refund against the exact second capture. Compensation preserves the original gross charges and failed verdict.
5. Prepare the hardened comparison and approve its original order. The same local interruption is followed by original-resource reconciliation and one entitlement. Trace playback shows the recorded sequence; it does not re-execute payment writes.

## Actual qualification

On 11 November 2026, a root browser run executed two approved baseline orders and one approved control order against PayPal sandbox. Independent fresh provider GETs confirmed the saved results. [The 16-check evidence manifest](evidence/live-bramble-qualification.json) retains source hashes, original resource IDs, sanitized event projections and measurement limits.

| Revision | Completed gross captures | Entitlements | Separate compensation | Original verdict |
| --- | --- | --- | --- | --- |
| Faulty | 2 / $24 | 1 | $12 on the second capture | Fail |
| Hardened | 1 / $12 | 1 | None | Pass |

This is one approved comparison, not a reliability-rate estimate or the 600-attempt context study. The connection interruption is deliberately local after an actual PayPal response. An earlier unapproved popup qualification created one order, was cancelled with no capture, and remains in history. No real money or physical fulfillment is claimed.

The local verification suite passes 348 checks. The 17 live-run checks include real SDK wire contracts, PostgreSQL concurrency, frozen approval origins, original-only recovery, changed-source rejection, cancellation during capture, unknown outcomes and bounded compensation. Browser qualification additionally covered reload/resource reads, the visible false failure, exact duplicate refund, trace inspection, and a 390px layout without document overflow.

## Authority and recovery

Each run freezes the actual target-source fingerprint and a one-hour grant. Every write rechecks session ownership, current source, expiry and cancellation. Original order/capture identities and leases persist before dispatch. At most three create/capture calls are concurrently leased; each session can reserve at most six captures/$72 gross in a rolling hour, including uncertain outcomes.

Provider calls never run inside a SQL transaction. A lost or uncertain answer keeps its reservation. **Read the original PayPal resources** performs scoped reads of saved resources; it does not send a fresh order or silently retry an unknown write. The hardened target can fulfill only with current authority and a confirmed completed capture. Cancellation after dispatch preserves observed money and prevents new entitlement issuance.

The compensation approval is separate, expires after one hour, and is bound to the original duplicate capture. A fresh capture read must show the exact unrefunded $12 before dispatch. Repeated commands reconcile their original refund operation. A failure before the core's refund claim currently remains held for review; the UI does not guess that nothing was sent or grant an automatic retry. Partial/external refund changes fail closed.

The browser can reload or close without erasing the original experiment. This runner currently qualifies L1/L2 behavior; remaining live scenario families, saved-wallet demonstrations and broader campaigns remain separate work.
