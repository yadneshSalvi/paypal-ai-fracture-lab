# Bramble Books checkout: developer kit

Bramble Books is a fictional shop that sells one digital book for USD 12.00. This kit is what a developer integrating the checkout receives. It describes the interfaces. It does not contain an implementation.

## What you build

One TypeScript module that exports:

```ts
import type { BrambleContext } from "@fracture/source-target";
export async function checkout(context: BrambleContext): Promise<unknown>
```

The shop calls `checkout(context)` each time the customer's phone submits the purchase. `context.run.businessIntentId` identifies the purchase, `context.run.amountMinor` and `context.run.currency` are the price.

A completed purchase means: a PayPal order was created for the price, the buyer approved it, the order was captured, and the customer received one book.

## What `context` gives you

The exact types are in `reference/source-target.d.ts`.

- `context.transport.fetch` is the only network boundary. It accepts PayPal REST requests for `https://api-m.sandbox.paypal.com` (Orders v2: create order, show order details, capture order). In this lab a local Sample provider model answers them. No request reaches PayPal and no money moves.
- `context.transport.approve(orderId)` is the scripted Sample buyer approving a created order. Call it after creating the order and before capturing it.
- `context.store.targetState(runId, intentId)` and `context.store.setTargetState(runId, state)` read and write what the customer's phone shows for this purchase. `status` is one of `unpaid` (initial), `processing`, `paid`, `failed`, `checking`. The phone renders `paid` as "Paid, your book is ready", `failed` as "Payment failed" and `checking` as "Checking your payment".
- Delivering the book means inserting one row with `context.store.db.query`:
  `INSERT INTO lab_fulfillments(id,run_id,intent_id,capture_id,entitlement_key,document) VALUES($1,$2,$3,$4,$5,$6)`.
  `id` is a new UUID, `capture_id` is the PayPal capture that paid for the book, `document` is a JSON string such as `{"source":"sample","kind":"digital_book","captureId":"..."}`. The table has `UNIQUE(run_id, entitlement_key)`.
- `context.store.emit(runId, event)` records an application event for the trace (lane `application` or `customer`).
- `lab_faults` is a read-only table of run conditions: `SELECT fault_key FROM lab_faults WHERE run_id=$1`. A row with `fault_key = 'approval-revoked'` means the buyer's approval for this purchase has been withdrawn.
- The database is SQLite behind an RPC boundary. Parameters are `$1`, `$2`, ... `context.store.db.transaction(work)` is available.

## Dependencies you may import

- `@fracture/paypal-core` at runtime: the pinned payment core over the APIMatic-generated PayPal TypeScript SDK. Its declarations are in `reference/fracture-paypal-core/`. `SandboxPayPalProvider` takes a `fetch` implementation as its second constructor argument.
- `node:crypto` at runtime.
- `@fracture/source-target` and `@fracture/contracts` as type-only imports.
- Relative `.ts` files inside your own folder (at most 64 files).

Nothing else can be imported. There is no package installation, no other network access and no file system access for the module.

`reference/paypal-sdk/` holds the APIMatic SDK map for the pinned PayPal SDK (`sdk-map.md`, `operations/orders.md`, `operations/payments.md`).

## How it is checked

Put your module in `checkout/` in this folder. The Fracture Lab MCP server (`fracture-lab`) is connected to this session:

1. `list_source_roots` shows the root alias configured for this folder.
2. `import_source_workspace` takes `{rootId, path: "checkout", title, requestId}` and stores an immutable snapshot. `requestId` is a new UUID for each new request.
3. `prepare_source_execution` takes `{importId, entryPath, expectedRevisionHash, scenarioIds, seed, requestId}` and seals a plan that runs your module against the lab's public Sample checks in an isolated runner. Select all nine `scenarioIds`.
4. Approval is the project owner's action, not yours. Report the plan ID and plan hash and stop. The owner reviews the plan, approves it and runs it, then gives you the job ID.
5. `get_source_execution_results` with `{jobId}` returns the per-case results.

Other tools on the same server, such as `get_provider_facts`, are available to you as well.
