# Tandem Tickets

Open `/tandem` or choose **Tandem Tickets** in the workspace. This laboratory runs the pinned APIMatic Python SDK and two executable ticket applications against a **controlled Sample provider**. It does not send PayPal payment requests or move money.

The customer buys one $48 ticket. The faulty application turns a lost capture response into failure and creates a new order on retry. The guarded application claims one durable purchase identity and resolves a missing capture response through the known original order. The observer records both outcomes without repairing the faulty application.

## Explore

- **The answer disappears:** run both revisions, then explicitly retry the baseline. Compare its $96 gross captures with the guarded application's $48. Repeating the guarded checkout reuses its ticket.
- **Still processing:** the baseline issues a ticket for a pending capture. The guarded target keeps checking and issues no ticket.
- **Recovery is unavailable:** the original capture exists, but the target cannot confirm it. The guarded target retains uncertainty and never substitutes another purchase.
- **An order without an answer:** the observer can see the committed order. The target did not receive its identifier, so it cannot invent a lookup by request ID.
- **An ordinary evening:** both applications complete the clean purchase.
- **The reservation lifecycle:** the guarded application authorizes $48, captures a $30 deposit, releases the remaining $18, and refunds the same captured $30. A release and a refund are shown separately; gross captures remain $30 and net becomes $0.

The evidence dialog, expandable histories, and JSON export contain the actual actions, original resource relationships, source and scenario hashes, operation identities, worker results, and hosted VM lifecycle receipts. The export includes a SHA-256 of its canonical content. Sample buyer approvals and injected response faults are explicitly labeled.

## Durability and isolation

Comparison creation and initial jobs commit together in PostgreSQL. A request identity admits one comparison; an action identity admits one job. Workflow start hooks close duplicate dispatches, and the authenticated minute scheduler recovers the queue/start gap. Three workers can run globally, with one per session. Every child request locks and checks the experiment and current 90-second job lease in the same transaction as the frame and its Sample effect. Nested savepoints preserve the duplicate-claim rollback behavior.

A worker that loses its lease cannot record another frame or publish a late completion. Expired and interrupted jobs remain uncertain; the workflow never automatically reruns their application action. A distinct customer retry is explicit and recorded. Cancel revokes future writes while preserving the original evidence. A guarded original-operation reconciliation remains available as a read. A missing resource identifier remains unknown.

Hosted workers restore the qualified Python runtime in a nonroot Vercel Sandbox with denied network access, read-only target source, no host mounts, and no forwarded credential environment. The finite parent/child budgets remain shorter than the job lease. Every created VM has a recorded disposal; unknown interruptions are retained. Parent database access and Vercel credentials never enter the Python process.

The local development mode executes the fixed, repository-owned Python source in a subprocess. It is explicitly labeled `trusted_local_fixed_source`, and is **not** arbitrary-code isolation. Hosted execution cannot enable this local mode.

## Run locally

Use Node 22 and PostgreSQL. Follow the Python environment instructions in `apps/fixtures/tandem/README.md` to prepare `.artifacts/tandem-venv` from the pinned SDK and locked requirements.

```sh
npm install
npm run db:migrate
npm run build
TANDEM_EXECUTION_MODE=local_fixed_source npm run start
```

Open `http://localhost:4104/tandem`. The existing judge session and origin checks apply to all routes. The additive Tandem tables initialize before the first experiment. `DATABASE_URL` and `JUDGE_SESSION_SECRET` remain server-only configuration.

For hosted execution, set `TANDEM_RUNTIME_SNAPSHOT` to a separately qualified snapshot in the same Vercel project/team. Vercel OIDC supplies runtime access. Do not copy a snapshot identifier from an expired or unrelated account. The existing `CRON_SECRET` protects `/api/cron/repairs`, which now recovers both repair and Tandem jobs.

## Verification boundaries

The domain and durable-job suite executes actual Python processes against isolated PostgreSQL schemas, including lost replies, pending capture, partial capture, concurrent refund limits, six simultaneous workers, restart, cancellation, cross-session rejection, and stale leases. Cloud qualification executes the same targets and guarded jobs in actual disposable VMs. Inspect `docs/evidence/tandem-*.json` for the scope, source hashes and observed results of each qualification.

These fixtures are public regression scenarios. They are not the planned held-out 600-attempt context study, proof of arbitrary-repository execution, or new observations of PayPal sandbox behavior. Existing real-provider qualifications retain their separate scope.
