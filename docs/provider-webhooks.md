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
