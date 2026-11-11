# Authentic delivery observer

The stable `/api/webhooks/paypal` receiver uses the project's registered sandbox webhook ID and PayPal's postback signature verification. Browser sessions do not authenticate this route. Simulator messages cannot pass this verifier; controlled transport tests are explicitly Sample evidence.

Each intake is committed before signature verification. The original body and signature headers are encrypted with AES-256-GCM and bound to the project, webhook and delivery identity. A domain-separated key comes from the existing private session secret. Do not rotate that secret without migrating retained encrypted evidence. OAuth tokens are never stored in an observation or verification trace.

A successful signature permits one canonical observation per project/webhook/event. Every delivery attempt remains separate. An exact duplicate is acknowledged; a changed body under the same event identity is quarantined. A failed signature cannot enter the canonical table. Temporary verification or database failure returns 503, preserving the unresolved intake for a later provider delivery. These observations do not fulfill a customer order or prove that a target application deduplicates fulfillment.

An owner can prepare a bounded receiver experiment using the local maintenance CLI:

```sh
npm exec -- tsx scripts/observe-webhooks.ts list
npm exec -- tsx scripts/observe-webhooks.ts arm-single-500 EXACT_ORDER_ID CHECKOUT.ORDER.APPROVED 60
npm exec -- tsx scripts/observe-webhooks.ts export-private DELIVERY_UUID
```

The failure rule must match the exact order and event type before its original expiry. Its one-use consumption is atomic with the canonical observation, so a deliberate 500 occurs only after the observation commits. It does not undo an approval, capture or other provider effect. The rule cannot be rearmed for the same scope/order/type. No public judge route can arm it, export private evidence, register a webhook or request a resend.

PayPal documents retries after non-2xx responses, with up to 25 attempts over three days. A documented retry schedule is not an observed result. Retain the actual signed transmission and timestamp before claiming redelivery. A resend request also needs its own independently received, verified transmission. Replaying a stored event is a separate replay mode. [PayPal webhook integration](https://developer.paypal.com/api/rest/webhooks/rest/)

Twelve PostgreSQL tests execute the installed core verifier against controlled HTTP responses. They cover raw postback bytes, encrypted originals, concurrent duplicate admission, conflicting event bytes, verification outage, forged/missing signature, certificate URL guards, exact expiring failure rules, rollback before acknowledgment, cross-project evidence and bounded HTTP intake. The full application suite has 317 passing tests at this checkpoint. Authentic provider qualification is a separate requirement and is not established by these tests.


## Executed approval-only observation

The preregistered campaign created six USD1 sandbox orders and obtained buyer approval for each. Independent provider reads confirmed APPROVED with no authorization, capture or refund. The receiver obtained six original `CHECKOUT.ORDER.APPROVED` events, each verified by PayPal postback and linked to its expected order. The safe frozen snapshot is `docs/evidence/paypal-webhook-delivery-qualification.json`.

Five original events were independently read through PayPal before one explicit resend request each. All five requests returned 202. Four have separate verified duplicate arrivals in this snapshot; resend 3 has only its original arrival. That missing observation stays inconclusive. No request was automatically repeated to improve the denominator.

The sixth event used an exact-order one-use failure rule armed before buyer approval. The receiver committed its canonical observation and returned HTTP500 at 03:22:48.380UTC. PayPal naturally delivered the same event again at 03:23:47.521UTC, 59.141 seconds later; the receiver verified it and returned200. Both deliveries retained the same original body hash and, in this observation, the same provider transmission ID. Independent intake UUIDs preserve both attempts. No explicit resend was requested for this event.

This proves the recorded receiver behavior for these approval events. It does not qualify capture-event ordering, a target application's fulfillment side effects, the full L5/L6 scenarios or a repeated natural retry guarantee. The F4 card remains inconclusive while only four of five matched explicit resends are observed. Seven reducer tests ensure acceptance-only, missing, duplicated, mismatched and failed-signature records cannot manufacture a completed claim. Raw originals, signatures, provider object identities and encrypted evidence remain private; published identities are SHA256 fingerprints.
