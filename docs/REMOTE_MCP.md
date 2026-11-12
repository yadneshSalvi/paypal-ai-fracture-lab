# Private remote MCP

Fracture Lab exposes the existing developer runtime at `POST /api/mcp` through the pinned `@modelcontextprotocol/sdk` **1.32.2** Streamable HTTP implementation. An editor can use the private stdio bridge without holding database or provider credentials. Both surfaces use the original trusted operator-created developer grant; they do not create a public owner-login flow.

## Operator configuration

The operator sets `FRACTURE_REMOTE_MCP_ORIGIN` on the web deployment to its exact public HTTPS origin, for example `https://fracture.example`. The endpoint is always `/api/mcp`; origin configuration cannot contain a path, query, fragment or user information. An unset origin disables the endpoint with HTTP 503. Use the final endpoint directly: credential-bearing redirects are refused, including same-origin redirects.

The existing application database, model configuration, Workflow configuration, cron recovery and isolated-runner configuration remain server-side. On Vercel, or with `FRACTURE_DURABLE_WORKFLOW=1`, this route calls the existing stable repair/campaign Workflow dispatchers after an accepted queue command. The database queue is authoritative. It never reruns the domain command to repair an uncertain Workflow start acknowledgement.

Before connecting an editor, a trusted operator must already have created an active owner grant using the existing [local CLI procedure](DEVELOPER_TOOLS.md#initialize-a-private-session) against the **same application database**. Its private credential file must be available on the editor workstation as an owner-only regular file, mode `0600`. The database stores the grant's secret hash. This unit supplies no new grant creation, transfer, refresh or OAuth endpoint. An expired or revoked file does not become a new session automatically.

## Cursor setup

Use Node 22 and this repository's exact-lock dependencies. Add the following entry to your personal `~/.cursor/mcp.json`, substituting absolute local paths and the configured public origin. Cursor documents this `stdio` command/args/env configuration and personal file location in its [official MCP guide](https://cursor.com/docs/mcp).

```json
{
  "mcpServers": {
    "fracture-lab-private": {
      "type": "stdio",
      "command": "/absolute/path/to/node",
      "args": [
        "--import",
        "/absolute/path/to/fracture-lab/node_modules/tsx/dist/loader.mjs",
        "/absolute/path/to/fracture-lab/apps/cli/src/remote-bridge.ts"
      ],
      "env": {
        "FRACTURE_REMOTE_MCP_ORIGIN": "https://fracture.example",
        "FRACTURE_DEVELOPER_CREDENTIAL_FILE": "/absolute/private/path/developer-session.json"
      }
    }
  }
}
```

The configuration contains only a destination and a private file **path**, never the bearer capability. No working-directory support, shell wrapper, `npx` download, `envFile`, database URL or provider key is needed. The bridge imports a pure guarded credential reader; it does not load `.env` or server configuration. If the file setting is omitted, it uses `.local/developer-session.json` in the bridge's own checkout. It accepts no command-line arguments.

Enable the server in Cursor's MCP settings. Start with `list_experiments`, `get_provider_facts` or `propose_scenario`. For a Sample experiment, send an explicit stable identity:

```json
{
  "scenarioId": "S0",
  "revision": "hardened",
  "seed": "editor-sample-01",
  "requestId": "editor-sample-request-01"
}
```

Call `run_curated_scenario` with those arguments, inspect the returned run ID using `get_run`, then export it with `export_report`. A Sample capture is a local provider-model observation, never a PayPal transaction. Editor tool approval does not expand the server grant or authorize live payments.

## Authority and tools

Every HTTP request authenticates the original bearer grant, including initialize, tool discovery, notifications, GET probes and DELETE. Authority is checked again after body arrival and immediately before SDK dispatch. Every tool call again uses `DeveloperRuntime`, which preserves strict schemas, ownership, quotas, exact source-view approval and durable request identities. Private results are checked again before publication. Revocation prevents later accepted calls on an established client; an already accepted standalone Sample operation may finish and retain evidence.

These local filesystem tools are absent from the hosted tool list and direct calls are refused:

- `list_source_roots`
- `import_source_workspace`
- `check_source_changes`

Use the authorized local CLI for those operations. Saved source reads and exports remain private and scoped by existing source authority. `approve_source_view` still binds one exact browser challenge, import and owner grant; it transfers no execution or payment authority. Imported application code and declared scripts are never executed.

Other existing developer tools retain their normal behavior and quotas: 120 tool calls/minute, 20 run requests/hour, 20 campaign commands/hour, 10 diagnoses/hour and 30 source commands/hour. Transport metadata and protocol requests additionally share a 120 HTTP requests/minute limit per grant. No tool accepts arbitrary financial URLs, amounts, payees or application execution paths.

## Accepted commands and uncertain acknowledgements

`requestId` is supplied by the caller, preserved byte-for-byte and bound to the original validated arguments. Transport reconnects never mint a replacement identity. There is no automatic HTTP POST retry, credential refresh, redirect replay or model/payment/create resubmission.

If a response is lost, the bridge returns the original JSON-RPC request ID with `REMOTE_ACKNOWLEDGEMENT_UNKNOWN`, `automaticRetry:false` and `commandMayHaveBeenAccepted:true`. Its stderr diagnostic is static and does not contain endpoint bodies, authorization headers, file contents, URLs or environment values. Read saved state using the original active grant:

1. `get_run({runId})`, or `list_experiments({})` if a create response was lost.
2. `get_campaign({campaignId})`, or `list_campaigns({})` if its create response was lost.
3. For generated repairs, inspect `get_run`'s `repairJobs` and `repairCandidates` before doing more work.

A deliberate repeat must use the identical request ID and body. Conflicting payloads are rejected. An interrupted synchronous `diagnose_run` keeps its original action ID; a read does not dispatch another model request. A lost provider-create acknowledgement remains governed by the existing runtime's unknown-outcome rules. This unit does not prove or repair any historical provider failure.

Queued commands preserve their original JSON tool result. MCP result `_meta["fracture/dispatch"]` adds `{status,operationId}`:

| Status | Meaning |
| --- | --- |
| `accepted` | The existing stable Workflow dispatcher returned an acknowledgement. |
| `pending` | The queue is retained; dispatch was uncertain or not yet acknowledged. Existing cron and the same stable hook recover it. |
| `worker_required` | Durable web dispatch is disabled; use the existing trusted local worker. |
| `not_required` | The saved command no longer requires a new wakeup. |

Repair operation IDs are `repair:<original-session-id>:<original-request-id>`. Campaign operation IDs are the existing saved campaign IDs; their dispatcher retains its existing versioned hook. A dispatch failure never substitutes another domain command. Closing stdio, cancelling an MCP request or sending DELETE ends observation; it does not revoke a grant, cancel accepted durable work, refund anything or delete evidence.

## HTTP and bridge contract

- The server uses a **fresh SDK server and stateless Web Standard Streamable HTTP transport for each request**, with JSON responses. There is no in-memory session registry, session cookie or `Mcp-Session-Id`.
- POST accepts one UTF-8 JSON MCP message, at most **32 KiB**, with `Content-Type: application/json` (optional UTF-8 charset) and both `application/json` and `text/event-stream` in Accept. JSON batches and compressed bodies are refused. Actual streamed bytes are checked as well as declared lengths. SDK validation performs protocol negotiation, notification handling, tool calls and protocol errors.
- The exact configured origin, request URL/path and Host must match. Present browser Origin must match, and cross-site/same-site browser actions are refused. Query credentials, CORS preflights, unsupported methods, stateful session/replay headers and arbitrary endpoint paths are rejected. No CORS authorization is returned.
- GET returns authenticated **405**, which the real SDK client expects when no standalone SSE stream is offered. DELETE returns an authenticated SDK disconnect acknowledgement. Both use the original grant and do not change domain state.
- Responses are `no-store`, vary by Authorization/Origin, and carry a new non-secret HTTP request ID. Bearer/cookie headers are removed before SDK request metadata is constructed.
- The bridge forwards protocol messages through the official SDK stdio and HTTP transports. Only protocol messages go to stdout. It pins the exact origin **and** `/api/mcp`, strips unrelated request headers, sets `credentials:omit`, refuses every redirect, bounds received bytes to **64 MiB**, bounds each network observation to **230 seconds**, and allows at most eight in-flight stdio messages. Its network credentials consist only of the original developer bearer capability.
- The internal bearer encoding is `Bearer fracture-v1.<grant-uuid>.<original-64-hex-secret>`. It is formed in memory from the guarded file and never belongs in client configuration, a prompt, a URL, process arguments, screenshots or diagnostics. The reader retains the existing owner/mode/regular-file/no-follow-symlink guards and strict credential schema.

For deliberate ephemeral local tests only, set `FRACTURE_REMOTE_MCP_ALLOW_LOOPBACK=1` on the bridge and local web process, and configure an explicit `http://127.0.0.1:<port>` origin. Only exact localhost/IPv4-loopback/IPv6-loopback names qualify. Hosted Vercel ignores this exception. No persistent development server is required by the bridge.

## Verification and remaining gates

```sh
node node_modules/typescript/bin/tsc --noEmit
npm run build -- --webpack
FRACTURE_REMOTE_MCP_BUILT=1 node --import tsx --test tests/remote-mcp*.test.ts tests/developer-tools.test.ts tests/source-access.test.ts
node --import tsx scripts/run-context-study.ts --verify-only --protocol evaluation/studies/fracture-context-2026-11-v1/protocol.json
```

Tests use the installed SDK's real HTTP client/server and fresh stdio subprocesses, ephemeral loopback listeners and temporary SQLite/source fixtures. The opt-in built test also exchanges initialization, Sample execution, saved reads and revocation against the compiled webpack route. Tests cover initialization/notifications/lists/calls/disconnects, established-client expiry/revocation, wrong-owner denial, source approval, filesystem-tool/alias refusal, original request recovery, unknown dispatch, disconnects, redirects, methods/origins/body bounds, private-file guards, no-dotenv loading, environment isolation and sanitized failure diagnostics. Diagnosis dispatch in these tests uses an explicitly local sentinel; no provider/model/financial request is made. PostgreSQL-only existing process tests require their separately authorized disposable database configuration.

This source unit has no deployed-HTTPS qualification, native Cursor session recording, new owner-grant distribution flow, arbitrary imported-application executor or new live financial tool. The existing `diagnose_run` is synchronous; hosted generated repairs and campaigns use their existing durable workers. Clients with a smaller message limit may need the local CLI for large private source exports. A working SDK process exchange establishes transport compatibility, not completion of the full recorded editor repair journey.

The original SEALED600 study remains **301 scored / 299 infrastructure / 606 attempts / six retries / 601 generations**, with eight incomplete strata and every comparison interval withheld. The verification command checks all **1,127 original frozen inputs** against protocol hash `5e2553c9d371c4f842fe60b0d68eeb26c58841c1738a4b71ff1d023617e37240`; it does not execute, reclassify or rerun the study.
