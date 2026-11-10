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
| `export_report` | JSON for one owned run and its redacted evidence. |

Every tool invocation revalidates the credential, grant expiry/revocation, active owner session, strict argument schema and ownership. Limits are 120 calls/minute, 20 run requests/hour and 10 diagnosis requests/hour per grant. An already accepted invocation can finish; revocation denies subsequent calls, including calls on an already-connected MCP client.

```sh
npm run cli -- revoke
```

Revocation preserves experiment history. To create a new session after expiry/revocation, select a new ignored private file with `FRACTURE_DEVELOPER_CREDENTIAL_FILE`, run `init`, and supply that same environment setting to CLI/MCP. The setting belongs to trusted process configuration, not tool arguments. Existing evidence remains in the original session; a new grant does not gain access to it.

## Qualification and remaining work

`node --import tsx --test tests/developer-tools.test.ts` runs 13 checks when PostgreSQL is configured: five boundary checks on both SQLite and a disposable PostgreSQL schema, private credential file validation, an actual MCP SDK client/server exchange, and fresh CLI plus real stdio MCP subprocesses sharing durable state. The process test revokes through the CLI while the MCP client is connected and confirms that subsequent reads fail.

The server uses the pinned `@modelcontextprotocol/sdk` 1.32.2 maintenance line and its official `McpServer`, `Client`, and stdio transports. See the [official TypeScript SDK documentation](https://github.com/modelcontextprotocol/typescript-sdk/blob/v1.x/README.md).

Generated repair execution, arbitrary workspace imports, live payment experiment tools, Python/Tandem tools, remote MCP hosting, and their complete acceptance proofs remain separate implementation work. They are not advertised as available MCP tools. The existing human-authored repair isolation qualification remains unchanged.
