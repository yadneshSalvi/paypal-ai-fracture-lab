# Durable campaigns and bounded failure reduction

The `/campaigns` laboratory compares the original faulty Bramble checkout with its hardened control under the same declared fault and seed. Its matrix reads only the saved cases of the selected campaign. Surrounding workspace runs, the introductory walkthrough, provider qualification receipts and the sealed context study never enter its counts.

All cases in this laboratory are **Sample**: the actual target code and pinned APIMatic SDK execute against the persistent local provider transport. No campaign sends a PayPal request, obtains a real buyer approval or asks a model to generate an answer. Tandem, Errand and live-provider experiments retain their separate workspaces and evidence.

## Run a comparison

Open `/campaigns`, choose any of S0, S3, S4, S5, S10 and A4, and select the paired baseline/control or one revision. Supply a reproducible seed, then start the campaign. The request saves all case IDs, original run IDs, scenario digests, revision digests, fault recipes and source/context bindings before a worker executes anything.

An unfinished interactive purchase remains under its owner's control. Finish or stop that journey before the campaign can continue. The queue does not secretly press the buyer's retry button. Browser reloads and the campaign selector restore the same records; the saved deadline never extends.

The browser uses Vercel Workflow continuations. An authenticated cron sweep retries dispatch using the original versioned hook, so a lost workflow-start response does not create a second campaign. For a local CLI or MCP session, run the independent worker:

```sh
node --import tsx scripts/campaign-worker.ts
```

Use `--once` to advance at most one saved case. The process uses the existing server-side `DATABASE_URL`. A single worker lease and the existing global experiment capacity gate execution. `SIGINT` or `SIGTERM` stops claiming new cases; completed observations remain in PostgreSQL.

## Read the evidence

The matrix contains one cell per declared case and revision. Completed, interrupted, pending and blocked counts stay separate. A harness intervention or missing observation is never promoted to a target pass. Inspect a cell to see captured money, fulfillment, all eight properties, their expected and observed values, and the exact witness events. Follow its run link for the full trace.

Failure groups organize baseline cases that violate the same measured property. This is a symptom grouping, not evidence of a shared cause. A separate reduction experiment can test a narrower claim.

JSON export includes the immutable manifest, every saved case receipt, current owned run observations, redacted evidence bodies, resource observations and a canonical SHA256 digest. `observationCutoffs` says whether each current run still matches the original case receipt. A later diagnosis, compensation or observation does not silently replace that receipt. Independently requested follow-up model attempts are listed separately from the campaign's zero-model execution.

## Find a smaller witness

Choose a completed faulty baseline case and a property that actually failed in that case. Reduction creates an independent campaign linked to the parent case, run, evidence digest, invariant ID and invariant version. The parent remains unchanged.

The current grammar contains the declared local fault components, such as losing a committed capture answer, blocking a reread, or letting the same customer retry. Reduction executes every subset, including the empty subset and the original, on both pinned revisions at the parent's seed. It preserves rejected reductions and their other failures.

A certificate is issued only when every declared baseline and control case completes, the selected property still fails in the chosen smallest subset, and the matching control passes that property. An unrelated failure is insufficient. Any interrupted subset or missing control withholds the certificate. This proves the smallest witness in this bounded component grammar and seed; it does not prove a globally minimal program, an organic provider fault, or superiority in the independent context study.

For the S3 duplicate-capture property, the executable regression expects a two-component witness: lose the capture answer and let the customer retry. The unavailable-reread component is unnecessary for that baseline defect. Smaller subsets with missing request identity remain visible as discarded reductions because they do not reproduce the selected duplicate-capture failure.

Follow-up read-only investigation keeps the reduced recipe. Reference verification reuses that subset's already-executed matched control; it does not silently execute the original full named scenario. The original campaign receipt remains fixed even when the run acquires later diagnostic observations.

## Recovery and authority

Repeated create or command requests must reuse the same request ID and body. A changed body under an existing identity is rejected. After an unknown response, retry the saved request rather than invent a replacement identity. The UI retains this pending command through reload; an unavailable browser store is shown as a recovery limitation.

A restarted worker adopts a completed original run's receipt. An expired worker stopped at a potentially dispatched write retains uncertainty and does not replay that write. Explicit continuation runs only the remaining unstarted cases; interrupted records remain interrupted. Changed source, context, runner bytes, case inputs or manifest digests stop further execution.

Stopping a campaign revokes dispatch in the same transaction as local provider mutation checks. Existing money/resource observations survive. The interrupted case becomes inconclusive, the active session is released, and late worker updates cannot turn it into a completed pass. Stop does not submit compensation.

CLI and MCP campaigns bind the original private developer grant as well as the session deadline. The worker rechecks expiry, revocation, owner role and grant identity before each mutation. Revoking the grant stops queued work and cannot be undone by a saved continue command. Raw grant identities and secrets are excluded from the campaign export.

## Developer tools

Initialize the private session as described in [Developer tools](DEVELOPER_TOOLS.md), then queue and inspect the same product flow:

```sh
npm run cli -- call create_campaign '{"scenarioIds":["S0","S3"],"revisions":["faulty","hardened"],"seed":"paired-demo-01","requestId":"paired-campaign-01"}'
node --import tsx scripts/campaign-worker.ts
npm run cli -- call list_campaigns '{}'
npm run cli -- call get_campaign '{"campaignId":"RETURNED_CAMPAIGN_UUID"}'
npm run cli -- call minimize_failure '{"campaignId":"RETURNED_CAMPAIGN_UUID","caseId":"FAILED_BASELINE_CASE_UUID","invariantId":"I2","requestId":"bounded-reduction-01"}'
npm run cli -- call export_campaign '{"campaignId":"RETURNED_REDUCTION_UUID"}'
```

`continue_campaign` and `stop_campaign` accept `{campaignId, requestId}`. These tools accept neither arbitrary source paths nor live payment parameters. The stdio MCP server publishes the same strict schemas.

The campaign tests run the fixture writes, concurrency, cancellation, worker restart, source/input changes, owner isolation, grant revocation and complete reduction search against SQLite and disposable PostgreSQL schemas. The developer process test crosses fresh CLI, the actual stdio MCP client/server, and the separate campaign worker. Those controlled tests are distinct from a native-browser qualification or live-provider observation.
