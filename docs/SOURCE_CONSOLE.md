# Private source snapshots in the console

The authenticated local CLI can import an explicitly authorized repository,
retain its exact sanitized file bytes, and produce a cited static integration
map. `/sources` displays that snapshot after the owner approves one browser
request. Opening the source console creates an unseeded browser session; it
does not start a purchase experiment.

The filesystem importer and TypeScript/Python analysis are described in
[Source workspaces](SOURCE_WORKSPACES.md). This document covers durable storage,
CLI/MCP tools, browser access, and the execution boundaries.

## Configure a local source root

Use the application's existing Node 22 and PostgreSQL setup. Configure trusted
root aliases on the CLI host; tool arguments accept an alias and a relative
directory, never an arbitrary absolute host path or interpreter.

```sh
export FRACTURE_SOURCE_ROOTS='[{"id":"checkout","directory":"/absolute/path/to/your/authorized/repository"}]'
npm run cli -- init
npm run cli -- call list_source_roots '{}'
npm run cli -- call import_source_workspace '{"rootId":"checkout","path":".","title":"My checkout","requestId":"REPLACE_WITH_NEW_UUID"}'
```

Replace each UUID placeholder with an actual UUID. `list_source_roots` reports
only root aliases, storage scope, and limits. It does not expose absolute source
directories or database credentials. Optional `FRACTURE_SOURCE_PYTHON` selects a
trusted absolute interpreter for the bounded `ast.parse` inspector. No imported
Python or TypeScript application code is executed.

Accepted source contents are copied into the database configured for this CLI.
Use local PostgreSQL to keep source on the host. A remote database is refused
unless its operator explicitly sets `FRACTURE_SOURCE_REMOTE_PERSISTENCE=1` in
trusted host configuration. This flag cannot be supplied through CLI tool
arguments, MCP arguments, or the browser.

Hidden files, dependency/generated trees, and recognized secret paths are
excluded. Recognized credential strings in source or emitted metadata reject
the import. Source snapshots and their private request ledgers also use
owner-only local storage; source and database paths never enter public DTOs.

## Request identity and recovery

An import reserves its original owner grant, deadline, payload digest, capacity,
and request UUID before scanning. Retrying the same UUID and body returns the
original accepted snapshot even if the current source has changed. Changing
the body under that UUID conflicts. A prepared filesystem publication can be
recovered without reopening mutable source. Pending or interrupted imports
retain their identity and failure state; they do not silently become a new
observation.

Complete source and metadata publish together in a database transaction.
Current owner authority is checked again after inspection. Revocation during
inspection prevents publication. The fixed original expiry never extends on
import recovery, browser approval, or later reads.

The local source cache is not needed for browser reads: accepted source bytes,
manifest, graph, and tool declarations are stored privately in SQL. Every file
read verifies its recorded hash and length; metadata and exports are also
checked. This permits a stable inspection after the original working tree
changes or the local cache becomes unavailable.

## Approve one browser view

1. Open `/sources` and request a browser connection.
2. Inspect the browser's confirmation label and choose the exact import ID
   returned by the owner CLI.
3. Run the displayed `approve_source_view` command through that authenticated
   CLI, with the browser connection ID, import ID, and a new request UUID.

The challenge is a public identifier, not a credential. It has no authority
without the owner's authenticated approval. No login credential is printed,
placed in a URL, copied to the browser, or transferred to an agent prompt.
The unapproved challenge expires after five minutes. Approved read access is
bounded by both original sessions and the original developer grant.

The browser receives only that snapshot's metadata, source reads, change
receipts, and export. It receives no repository-import, application-execution,
model, or payment authority. Other import IDs remain inaccessible. Cancelling
the browser connection withdraws its view; revoking the owner grant denies all
future snapshot, file, and export requests, including connected MCP clients.
Previously delivered source is already in the recipient's possession.

## Tools and retained observations

| Tool | Scope |
| --- | --- |
| `list_source_roots` | Configured aliases, storage mode and bounded limits. |
| `import_source_workspace` | Owner-only immutable source import and static inspection. |
| `list_source_workspaces` | Bounded metadata for readable imports. Full graphs and file bytes are not fetched for this list. |
| `get_source_workspace` | Exact source manifest, AST map, tool declarations, coverage and retained change checks. |
| `read_source_file` | One accepted relative path and its exact expected hash. |
| `check_source_changes` | A separately identified observation of the current authorized source tree. |
| `approve_source_view` | One explicit read-only browser approval for one exact import. |
| `export_source_snapshot` | Private source bytes and evidence in a canonical-hash JSON report. |

A change check never replaces the original snapshot. Same-request recovery
returns the original recorded check. An interrupted check remains incomplete;
a later observation needs a new explicit request UUID. The UI and export retain
pending and interrupted checks alongside complete receipts. A previous complete
check describes its own timestamp, not the current unobserved working tree.

Bounds are 1,000 files / 12 MiB per snapshot, 20 import identities and 48 MiB reserved
or accepted source per owner session, 20 retained change checks per snapshot,
and 30 source commands per hour. Each file is bounded to 512 KiB. Rejected imports
release their byte reservation; unresolved imports retain it. The filesystem
inspector has additional parser, graph, path and process limits.

## Evidence and remaining execution gate

AST syntax, inferred edges, unresolved calls, static risks, and actual runtime
observations are different evidence categories. These imports contain static
analysis only. An import named `paypal` is a syntax hint, not proof that a
specific APIMatic SDK package, commit, version, method or account capability is
installed. Dependency manifests and lockfiles have exact source hashes; verified
runtime SDK/provider facts require their separate bindings and receipts.

The report states zero imported application commands, model calls, and payment
provider calls. Trusted compiler/AST parser processes perform the inspection.
The original 600-case context study is neither rerun nor extended by importing
source. General imported-application execution, adapter qualification, smoke
journeys, and provider-backed campaigns remain separate implementation and
authorization gates; the source snapshot does not certify them.

`tests/source-access.test.ts` exercises actual filesystem imports, both SQL
adapters, ownership, byte/hash integrity, concurrent recovery, fixed expiry,
mid-import revocation, observation history, quotas, remote-storage opt-in, and
fresh CLI/stdio-MCP processes. `tests/source-api.test.ts` executes the actual
route handlers for unseeded sessions, origin/body/schema checks, exact browser
approval, source/export hashes and immediate denial after revocation. Native
browser qualification is separate from those service tests.
