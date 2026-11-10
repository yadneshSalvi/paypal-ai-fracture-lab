# Deliberate Bramble baseline defects

Bramble is a fictional USD12 digital bookshop. `faulty.ts` is a curated teaching specimen, not a claim about another merchant's implementation.

1. Each retry creates a new order for the same purchase intent. Both orders require separate Sample buyer approvals in the local runner.
2. A dropped capture response is presented as “Payment failed.” There is no authoritative reread.
3. Fulfillment has no semantic entitlement deduplication; repeated successful handler paths can repeat work.
4. A returned pending capture is assumed paid.

The lab's raw-request recorder leaves missing request headers missing. It does not route this code through the hardened payment core. The local provider model permits one capture per approved order, making two observed captures require two distinct approved orders. The passing happy-path suite deliberately does not exercise these faults; the lab's independent regression cases do.

`hardened.ts` adds a durable business claim, stable provider identities, pending outcome handling, reconciliation, and one fulfillment entitlement. The SDK migration alone is not the fix. Every displayed result is linked to a persisted run and its source hash.
