# Original-order Toolkit investigations

The AI workbench can start an actual Gemini investigation of an existing, completed Sample purchase. The installed `@paypal/agent-toolkit` 1.11.0 exposes exactly `get_order`. Its transport maps the declared uppercase wire alias to the original run-owned Sample order; it cannot create, capture or refund resources. A model answer remains distinct from a payment observation or an independently verified repair.

The server requires `GEMINI_API_KEY`, `GEMINI_MODEL`, `DATABASE_URL` and `JUDGE_SESSION_SECRET`. Credentials stay on the server. The isolated Toolkit worker receives only `NODE_ENV` and the declared order/call identities. It uses the controlled Sample adapter, never a financial provider connection.

## Durable work

An explicit command saves the original witness, its source and witness hashes, selected model and durable request identity. Three Workflow steps execute model selection, the installed Toolkit read, and model conclusion. Each model call has a 180-second deadline and the per-request transport's explicit connect/header/body limits. A worker has a 240-second renewable lease. Each step disables automatic retries; durable SQL state determines what can safely continue.

A completed model receipt, original tool observation or final conclusion is reused under its deterministic identity. A lost provider-create acknowledgement remains unresolved and is never automatically replaced. A known stopped workflow can continue from the same saved phase. Stop/resume commands have their own immutable, hashed acknowledgements. Cancellation fences publication even when a pending model answer arrives later.

The queue/start gap uses the same versioned Workflow hook with 30-day retention. The authenticated repair scheduler also recovers pending Toolkit dispatches. The existing schema-local worker lock serializes concurrent first-time schema initialization; PostgreSQL `IF NOT EXISTS` alone is insufficient for that race.

## Application surface

- `/ai-workbench` reads an existing session. Anonymous entry requires an explicit choice to create a Sample workspace.
- `GET /api/model-investigations` lists owned investigations and eligible witnesses. `?requestId=...` resolves an exact saved submission, including one outside the recent list. Reads create neither sessions nor investigation tables.
- `POST /api/model-investigations` accepts `{runId,requestId}` and saves/dispatches that one operation.
- `GET /api/model-investigations/:id` reads the owned investigation.
- `POST /api/model-investigations/:id` accepts `{action:"resume"|"cancel",requestId}` for the original job.
- `GET /api/model-investigations/:id/report?format=json|html` exports the public receipt chain, command history, frozen witness, source provenance and integrity hash. HTML is self-contained, escaped and script-free. Private model context is excluded.

All routes use the existing same-origin, session and developer-authority checks. Mutation controls retain their original browser intent across a lost acknowledgement; refresh and visible-page polling issue GET requests only. Late responses from an earlier actor or an older read cannot replace the current view.

## Qualification boundaries

Domain tests exercise actual installed Toolkit code over controlled Sample transport and both SQLite/PostgreSQL persistence. Model responses in those tests are explicit fixtures. Mounted component tests exercise the real React effects, network handling, five-second polling, duplicate-submit protection, request recovery, session fencing, exports and focus.

Actual provider qualification is separately declared against a frozen application source/build and original Sample actor/order. It is not a new attempt in, or replacement for, the sealed 600-case context study. Earlier timeout and provider-overload outcomes remain unchanged. The original study's scored/infrastructure denominators and withheld comparisons stay intact.
