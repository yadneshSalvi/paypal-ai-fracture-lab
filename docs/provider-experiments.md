# Create-order request identity

Fracture runs owner-controlled, preregistered experiments separately from judge sessions. The first experiment asks whether PayPal's create-order endpoint joins two calls that carry the same generic `Idempotency-Key` without `PayPal-Request-Id`.

The executed campaign used five matched trials, four randomized treatments per trial, and two calls per treatment. Every call within a trial used the same USD1.00 body and custom reference. Invoice uniqueness, payment sources, payer approval, capture and natural already-captured constraints were absent. All 40 calls were independently read back; all orders remained CREATED. Thirty-five distinct unapproved order resources were observed, with zero approvals, authorizations, captures or refunds.

| Treatment | Observed orders per two calls | Trials |
|---|---:|---:|
| Same PayPal-Request-Id; different generic keys | 1 | 5/5 |
| Different PayPal-Request-Id and generic keys | 2 | 5/5 |
| Same generic key; no PayPal-Request-Id | 2 | 5/5 |
| Different generic keys; no PayPal-Request-Id | 2 | 5/5 |

This contradicts generic-header deduplication for this endpoint, isolated US sandbox merchant and short measured windows. It does not establish capture/refund behavior, retention duration, production eligibility or a universal SDK defect. PayPal documents endpoint-dependent `PayPal-Request-Id` support; the SDK's generated generic header is a different field. The observation supports verifying integration assumptions, rather than treating SDK header names as provider guarantees. [Official idempotency documentation](https://developer.paypal.com/api/rest/reference/idempotency/)

The safe record in `docs/evidence/paypal-create-identity-qualification.json` contains all20 pair outcomes, request/response hashes, hashed resource identities, exact observation times, frozen implementation hashes and the retrieved documentation hash. Raw provider bodies, keys, configuration and the immutable manifest remain private. No secrets or original order IDs are included in the public record.

## Reproduce with your own isolated sandbox

Install the pinned project, configure `.env` using `.env.example`, and run:

```sh
npm exec -- tsx scripts/probe-create-identity.ts prepare
npm exec -- tsx scripts/probe-create-identity.ts run <prepared-campaign-uuid>
npm exec -- tsx scripts/probe-create-identity.ts report <prepared-campaign-uuid>
```

Preparation saves the manifest and source/document hashes before any PayPal request. The run requires the same source and merchant configuration. PostgreSQL stores every unique call slot before dispatch; a campaign lock prevents simultaneous executors. Calling run again never recreates a dispatched slot. A known original resource can be reread; an unknown create without an observed ID remains inconclusive. There is no invented lookup by request ID and no automatic write retry. The transport admits only OAuth, create order, and reads of that campaign's observed IDs; it cannot approve, capture, refund or choose another host.

The campaign lock holds a dedicated direct PostgreSQL connection. Transaction-pooling endpoints cannot preserve a session lock between statements. With a pooled Neon `DATABASE_URL`, provide `DATABASE_URL_UNPOOLED` for the identical endpoint, database and user; an unknown mapping fails before execution. A failed unlock discards the connection and reports an error. These connection guards do not rerun or alter an earlier frozen campaign.

The CLI is not exposed as a public judge mutation. The Provider Facts page and scoped MCP read surface publish the historical result. A failed control, refused call, unknown outcome or missing pair prevents a conclusive repeated-observation label. Twelve real-SDK/PostgreSQL fixture tests cover restart, concurrent claims, lost/malformed responses, never-sent authentication, controls and contrary outcomes. Fixture tests are not the live observation.
