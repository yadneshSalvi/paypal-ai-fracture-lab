# Fracture Lab from a terminal or agent

The CLI and local stdio MCP server call the same durable `LabService` used by the browser. They execute the qualified Bramble **Sample** scenarios and preserve source, seed, original invariant results, trace receipts, and command identity. A Sample capture is an observation from the local provider model, never a PayPal transaction.

## Initialize a private session

Use Node 22, install with `npm ci`, and configure the existing PostgreSQL `DATABASE_URL` in `.env`. Then run:

```sh
npm run cli -- init
npm run cli -- status
npm run cli -- call list_experiments '{}'
npm run cli -- call propose_scenario '{"scenarioId":"S0","revision":"faulty"}'
npm run cli -- call run_curated_scenario '{"scenarioId":"S0","revision":"faulty","seed":"demo-seed-01","requestId":"demo-faulty-01"}'
```

`init` creates a 24-hour owner session without starting an experiment. It stores a random capability in ignored `.local/developer-session.json`, mode `0600`; the database stores only its hash. Calling `init` again uses the existing active session. The CLI never prints the capability. Private files with broad permissions, symlinks, unexpected fields, or invalid ownership are rejected.

Use the returned run ID with `get_run` or `export_report`. Repeat a run request only with the same request ID **and** the identical scenario, revision, and seed. An altered payload under the same identity is rejected. Each run uses the fixed Bramble fixture and noninteractive Sample execution; unknown input properties are rejected.

```sh
npm run cli -- call get_run '{"runId":"REPLACE_WITH_RETURNED_UUID"}'
npm run cli -- call export_report '{"runId":"REPLACE_WITH_RETURNED_UUID"}'
```

For machine-readable stdout without npm's banner, invoke `node --import tsx apps/cli/src/index.ts ...` directly. Redirect an exported report to the caller's chosen file. The tool itself accepts no output path, arbitrary workspace path, merchant, payment amount, or URL.

## Connect an MCP client

Initialize once, then configure the client with this local process (substitute the absolute checkout path):

```json
{
  "mcpServers": {
    "fracture-lab": {
      "command": "node",
      "args": ["--import", "tsx", "apps/mcp/src/index.ts"],
      "cwd": "/absolute/path/to/fracture-lab"
    }
  }
}
```

The host must use Node 22 and support the configured working directory; clients whose configuration lacks `cwd` can launch an equivalent local shell wrapper that changes directory first. No capability or database password belongs in an agent prompt. The subprocess loads private server configuration from the checkout. Protocol stdout contains MCP messages only; safe startup failures go to stderr.

Available tools:

| Tool | Result and side effects |
| --- | --- |
| `get_provider_facts` | Published qualification facts with limitations. Historical receipts do not authorize current payments. |
| `list_experiments` | Scenario availability and the current developer session's persisted runs. |
| `get_run` | One owned run with provenance, resources and invariant verdicts. |
| `propose_scenario` | A qualified curated configuration; does not execute it. |
| `run_curated_scenario` | Executes and persists the selected Sample experiment. |
| `diagnose_run` | Calls the configured AI provider around scoped evidence reads and saves the diagnosis. Requires the existing model configuration. |
| `propose_repair` | Queues a new model candidate from exact source and pinned contracts; local worker required. |
| `verify_patch` | Queues the exact saved candidate in the isolated evaluator; local worker required. |
| `export_report` | JSON for one owned run, its repair candidates and redacted evidence. |
| `list_campaigns` / `get_campaign` | Saved owned campaign manifests, exact case counts and reduction certificates. |
| `create_campaign` | Queues qualified Bramble Sample cases with fixed revisions, seed, source bindings and deadline. |
| `continue_campaign` / `stop_campaign` | Continue only remaining unstarted cases, or revoke dispatch while preserving partial observations. |
| `minimize_failure` | Queues all declared fault-component subsets and matching controls for one observed failing property. |
| `export_campaign` | Exact manifest and case receipts, current owned evidence, resource observations and cutoff hashes. |

Every tool invocation revalidates the credential, grant expiry/revocation, active owner session, strict argument schema and ownership. Limits are 120 calls/minute, 20 run requests/hour, 20 campaign commands/hour and 10 diagnosis requests/hour per grant. Campaign stop does not consume the campaign execution quota. An already accepted standalone curated experiment can finish; revocation denies subsequent calls, including calls on an already-connected MCP client. Queued generated-repair jobs recheck the owner grant before execution and publication. Campaign workers recheck that original grant at every Sample mutation boundary, so revocation stops further dispatches without deleting observations.

See [Durable campaigns and bounded failure reduction](CAMPAIGNS.md) for the matrix, reduction certificate, local worker, exact recovery rules and CLI examples. Campaigns execute independently of the request that creates them; start `node --import tsx scripts/campaign-worker.ts` for local CLI/MCP work.

```sh
npm run cli -- revoke
```

Revocation preserves experiment history. To create a new session after expiry/revocation, select a new ignored private file with `FRACTURE_DEVELOPER_CREDENTIAL_FILE`, run `init`, and supply that same environment setting to CLI/MCP. The setting belongs to trusted process configuration, not tool arguments. Existing evidence remains in the original session; a new grant does not gain access to it.

## Qualification and remaining work

`node --import tsx --test tests/developer-tools.test.ts tests/campaign-lab.test.ts` checks SQLite and disposable PostgreSQL schemas, private credential files, actual MCP SDK client/server exchanges, and fresh CLI, campaign-worker and stdio MCP subprocesses sharing durable state. The process test queues through MCP, runs both campaign cases in independent workers, exports their actual receipts, then revokes through CLI and confirms that a queued reduction stops and later MCP reads fail. Campaign tests also cover concurrency, unknown writes, partial cancellation, stale inputs and exhaustive property-preserving reduction.

The server uses the pinned `@modelcontextprotocol/sdk` 1.32.2 maintenance line and its official `McpServer`, `Client`, and stdio transports. See the [official TypeScript SDK documentation](https://github.com/modelcontextprotocol/typescript-sdk/blob/v1.x/README.md).

Arbitrary workspace imports, live payment experiment tools, Python/Tandem tools, remote MCP hosting, and their complete acceptance proofs remain separate implementation work. They are not advertised as available MCP tools. Generated repairs are the bounded local worker workflow below; the existing human-authored reference remains a separate provenance.

## Generated repairs and the local worker

`propose_repair({runId, requestId, repairId?})` queues a new model-authored candidate for an owned, current faulty Bramble Sample run. It reads the complete tracked contract sheets, TypeScript integration companions, installed core declarations and bounded fixture capabilities. A separate contract-binding call must pass before the source-authoring call. Supply an owned `repairId` to refine that immutable candidate using its source and recorded policy/behavior failures. The refinement is a new candidate; prior results are never overwritten. Model attempts and rejected candidates remain visible; neither model output nor the authored reference is labeled as a verified generated fix.

Start the independent local process with `npm run worker:repairs`, or process at most one queued job with `npm run worker:repairs -- --once`. The web request commits the job; Vercel and locally enabled Workflow dispatch durable continuation separately. The local process requires the prepared dedicated Docker runner described in the README. It never executes candidate source in the web server.

`verify_patch({runId, repairId, requestId})` queues the exact saved candidate. Verification binds its source digest, context digest, frozen suite digest, image ID and snapshot hash. Compilation plus nine unchanged regressions are reported individually. These public regressions are not the separate 600-attempt context study. A failed behavior check remains failed; no human reference is silently substituted.

Job IDs are scoped to the session and command. One repair worker claims a job at a time; the global experiment capacity also bounds model and container work. An expired generation lease resumes only an existing background-response checkpoint; a missing response identity remains ambiguous and is never resubmitted automatically. Other interrupted jobs fail visibly. Cancellation, expired sessions and revoked developer grants prevent publication of late results. Existing attempts remain available for inspection. Hosted verification requires the pinned, qualified isolated snapshot described below.

`get_run` also returns this run’s repair candidates and saved job statuses, so a client can inspect the exact diff and wait for completion without resubmitting. The repair screen exposes the same queue and evidence, with separate labels for Astra candidates, authored references and deliberately seeded policy tests. A verified patch can be exported; export does not modify or deploy any application.

### Durable model generation and hosted isolation

`generate` queues an immutable action and runs the complete contract plan before candidate authoring. Each role creates one OpenAI background response (`background:true`, `store:false`), then persists its response ID. A worker releases its SQL lease between short GET polls. A lost initial create response stays unknown and is never automatically resubmitted. A new attempt is an explicit user action; earlier failures remain in history. Background responses have temporary provider retention for polling even with `store:false`.

Source authoring allows 128,000 output tokens, including reasoning, at maximum effort. The earlier 45,000-token attempt exhausted that allowance without producing source; its incomplete provider receipt remains retained. The expanded allowance matches [GPT-6 Astra's documented output limit](https://developers.openai.com/api/docs/models/gpt-6-astra); it is not a claim that a candidate passes verification.

Vercel Workflow resumes the job after each durable sleep. A one-minute authenticated `/api/cron/repairs` sweep closes the SQL-queue/workflow-start gap; an action-specific hook prevents duplicate starts. Cancellation checks current authority, cancels the original response, and rejects late publication. A failed cancellation retains the response ID for another idempotent cleanup attempt.

For local durable execution, build and start with `WORKFLOW_TARGET_WORLD=local` and `WORKFLOW_LOCAL_DATA_DIR` set to an absolute private directory outside `.next` (for example `.artifacts/workflow-data`). Set `PORT=4104` and `FRACTURE_DURABLE_WORKFLOW=1` when starting. Keep the workflow data directory across rebuilds. The CLI polling worker remains available when Workflow is not enabled.

Hosted candidate code runs in a separate Vercel Sandbox microVM restored from a pinned snapshot, with deny-all networking, a non-root user, no host mounts or application credentials, and root-owned read-only reference files. The VM root is writable; it is not reported as a read-only root. A 55-second command deadline and independent 70-second VM lifetime bound execution. A passing result is published only after source/suite identity checks and confirmed VM disposal.

To prepare a new snapshot on an authenticated owner workstation:

```sh
npm run prepare:isolation -- --context-only
npm run prepare:isolation:cloud
```

Use Vercel OIDC authentication or explicit `VERCEL_TOKEN`, `VERCEL_TEAM_ID`, and `VERCEL_PROJECT_ID` for the trusted SDK process. These values are never sent to candidate code. Read `.artifacts/isolation-cloud/snapshot.json`, then configure its snapshot ID, input hash and suite hash as `FRACTURE_REPAIR_SNAPSHOT_ID`, `FRACTURE_REPAIR_SNAPSHOT_HASH`, and `FRACTURE_REPAIR_SUITE_HASH`. A snapshot expires after 30 days; rebuild and qualify before replacing these values. Production also requires `CRON_SECRET`, `APP_URL`, the server model key, and a PostgreSQL connection with certificate verification.

The public `docs/evidence/hosted-isolation-qualification.json` records actual reference-run, network-denial, cancellation and deadline measurements. It does not claim model-generated repair success or completion of the context evaluation study.
