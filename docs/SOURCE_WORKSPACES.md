# Source workspaces

Fracture Lab can import an authorized local repository as an immutable, private snapshot and build a source-linked commerce integration graph. This is static inspection. Imported application code, package scripts, dependency installers, payment calls and model calls do not run. An outbound destination is an untrusted declaration, never permission to contact it.

The importer is `packages/source-workspaces/src/index.ts`. The service consumer must authenticate the owner and enforce session/grant ownership before every snapshot, file, change-receipt or export read. An opaque snapshot ID grants no access by itself. Private source content is not a public evidence artifact.

## Trusted authority

The host creates the store from trusted configuration. A request supplies only a configured root ID, a portable relative directory and a service-generated durable request key. It cannot supply another root, storage directory, interpreter, dependency command or destination allowlist.

```ts
import { createSourceWorkspaceStore } from "./packages/source-workspaces/src/index";

const store = await createSourceWorkspaceStore({
  storageRoot: "/private/operator/source-snapshots",
  allowedRoots: [{ id: "checkout", directory: "/approved/checkout-sources" }],
  // Optional trusted interpreter, outside imported source roots:
  pythonExecutable: "/usr/bin/python3",
  // Optional additional exact credential values, supplied privately by the host:
  secretValues: [],
});

const snapshot = await store.importSnapshot({
  rootId: "checkout",
  path: "shop", // "." selects the configured root itself.
  requestKey: serviceGeneratedScopeAndRequestSha256,
});
```

Root IDs are aliases. Public snapshot metadata contains repository-relative source paths and opaque digests, with no absolute source-root, storage-root or interpreter paths. Original source is opened read-only and remains unchanged. Owner-authorized `readSource` returns the exact private source text; its content must not be included in a public report without a separate disclosure decision.

## Snapshots and durable requests

`importSnapshot({rootId,path,requestKey})` validates and collects the complete accepted source, excludes secrets, parses it, then checks the source again before publishing a private staging directory with an atomic rename. A changing, invalid or over-budget import publishes no snapshot. Files are stored with owner-only read permissions; store directories are owner-only. Application APIs never overwrite published files.

Each file has an exact SHA256, UTF-8 byte count and language. `revisionHash` binds the sorted accepted file manifest and source-policy version. `tools.hash` binds script declarations, dependency manifests and lockfile hashes. `manifestHash` binds the complete snapshot DTO. The snapshot ID additionally binds source authority, source revision, analysis, exclusions and the execution capability declaration. Two concurrent imports of equivalent source and analysis converge on one published identity and creation time.

The private request ledger is written before source collection. Its key must be a SHA256 derived by the authenticated service from the caller's scope and durable request UUID. Repeating the same key and input returns the original accepted snapshot even when the live source has changed or disappeared. Reusing a key with a different root/path returns `SOURCE_IMPORT_CONFLICT`.

Ledger states are `pending`, `prepared`, `complete` and `failed`. An interrupted pending import is preserved and returns `SOURCE_IMPORT_PENDING`; it is not silently restarted against a newer revision. A prepared record whose exact snapshot was published can finish without rereading live source. Failed requests retain their original error. After inspecting an interrupted or failed receipt, an owner can explicitly start a new request identity. Staging remnants from a process crash are retained for operator review; the store does not erase them at startup.

`getSnapshot(id)` and `readSource({snapshotId,path,expectedHash})` read private snapshot bytes, never the current repository. Reads verify content, manifests and origin binding. A wrong expected hash returns `SOURCE_HASH_MISMATCH`; corrupt storage fails closed.

`checkChanges({snapshotId})` re-inspects the original authorized directory without parsing or executing it. It saves an immutable receipt with exact added/modified/deleted paths, before/after hashes and byte counts, the original/current revision hashes and its own receipt hash. It does not mutate or promote the original snapshot. Changes inside excluded files are not read; `exclusionsChanged` reports changes to the exclusion manifest, not hidden-file contents.

This filesystem implementation requires durable, private host storage. It is not a claim that a serverless function's local disk is durable. The application layer can copy accepted metadata and exact private contents into its tenant-scoped durable store while retaining these hashes and authority checks.

## Import boundary and budgets

Absolute request paths, traversal, backslashes, percent escapes, control characters, hidden selectable paths and excluded dependency/generated directories are rejected. Source entries use portable ASCII names. Symlinks and special files are rejected, including symlinks at excluded top-level entries; regular files with multiple hard links are rejected. Ancestor, inode, size and timestamp checks surround no-follow reads. Complete source/exclusion manifests are rechecked before publication. This is a bounded snapshot collector over the host's trusted filesystem, not an execution sandbox or a formal defense against a compromised filesystem implementation.

Hidden paths, `.env` variants, Git metadata, credential/key files, private plans, dependency trees and generated outputs are excluded before their contents are opened. Accepted files must be valid UTF-8 text. Secret checks run over complete file contents before staging, so read-chunk boundaries do not bypass checks. Recognized credential formats, credential-bearing URLs, private keys and non-placeholder literal credential fields are rejected. Trusted configuration can add exact known secret values, including their base64 representation. The scanner is conservative and cannot certify the absence of every unknown secret; accepted source remains private.

Default bounds:

| Resource | Default |
| --- | ---: |
| Accepted files | 1,000 |
| Enumerated entries | 4,000 |
| Accepted source bytes | 12 MiB |
| One file | 512 KiB |
| Directory depth / relative path | 20 / 240 characters |
| AST nodes per file / syntax depth | 60,000 / 200 |
| Graph nodes / edges / findings | 15,000 / 30,000 / 4,000 |
| Parser wall time per language batch | 4 seconds |
| TypeScript worker old-generation heap | 192 MiB |

Trusted configuration may lower limits or raise them only within fixed hard ceilings. Two imports may collect/parse/publish concurrently in one process; at most sixteen wait for a slot, with a fifteen-second queue deadline. File contents, parser output, private metadata reads and script declarations have additional bounded sizes. No partial file prefix is treated as a complete snapshot.

## Source-linked analysis

TypeScript/JavaScript uses the installed TypeScript compiler API in a trusted worker with a restricted environment, memory limits and a terminating deadline. Repository text is passed as data to `createSourceFile`; it is never used as a module specifier or executed. The mapper recognizes raw PayPal HTTP syntax, APIMatic-context `paypal` imports, the distinct public server SDK and legacy import shapes. Import recognition does not verify dependency versions, SDK operation contracts, deprecation or endpoint behavior.

The graph includes source files and imports, functions and routes, commerce-intent references, provider operations, request-identity syntax, state writes, fulfillment, webhook handlers, resource reads and declared outbound origins. Relative imports link to accepted files when resolvable. Local call edges resolve supported lexical bindings. Imported/dynamic calls remain unresolved. Mutated objects, spreads and shadowed receivers do not borrow identity evidence from unrelated initializers.

Every node, edge and finding cites a file hash and exact source span. Lines and columns are one-based. Offsets count UTF-16 code units; separate byte offsets count UTF-8 bytes. Span ends are exclusive. Source bytes, BOM, CRLF and Unicode are preserved.

Finding classes are missing provider request identity, generic identity reliance, unresolved payment calls, unverified webhook signatures, unknown outcomes without a recognized reread, and fulfillment without recognized completed-capture evidence. Each is `risk` or `unverified` and explicitly requires runtime evidence. Generic `Idempotency-Key` reliance links to F9 and stays unverified here. A present field does not prove stable business identity, an effective signature check, correct money handling or a successful provider operation. Static findings are never converted into runtime defects or passes.

When an explicitly configured trusted Python interpreter is available, the mapper sends text over stdin to Fracture's fixed `ast.parse` inspector under `-I -S -B`, with no inherited credentials and no imports from the repository. It detects supported calls, state writes, fulfillment, webhook and identity syntax. Python maps are **partial**: binding and control-flow analysis are narrower, and fulfillment guard safety remains unresolved. Python inspection caps each file at 128 KiB, in addition to AST/depth, CPU and wall-time bounds. The inspector attempts a 256 MiB process data limit; hosts such as macOS that refuse it are identified in coverage limitations. That host is not advertised as a qualified code-execution boundary. Without an interpreter, Python files are retained with an explicit unsupported map status.

`package.json`, Makefile, Dockerfile and supported Python build declarations produce a tool manifest. Script names, command hashes, source spans, shell-syntax indicators and declared outbound origins are visible. Raw command bodies remain in private source. `commandsExecuted` is always zero and `dependenciesInstalled` is false.

## Execution gate

Snapshots advertise `execution.status = "static_only"` and `arbitrarySourceExecution = false`. `SourceExecutionAdapter` is a qualification hook, not an executor. Later execution requires owner authority for exact snapshot/entrypoints/tests, a separately qualified isolated runner, read-only mounting, no host secrets, CPU/memory/time bounds, deny-by-default network policy, separately authorized installation/commands, actual smoke observations, cancellation/disposal checks and source-hash fencing. An existing curated fixture runner does not automatically qualify an arbitrary imported repository.

The original SEALED 600-case study, its frozen inputs, original attempt outcomes, incomplete strata and withheld intervals are independent of this feature. Import and parser tests do not execute, alter or reclassify that study.

## Source Atlas

`/sources` opens an unseeded, source-only browser scope. It does not start a fixture purchase. The owner imports through the authenticated local CLI. The browser creates a public connection challenge; the CLI explicitly approves that challenge for one exact import after displaying its confirmation. There is no credential-bearing URL or arbitrary-path browser import.

The Atlas shows a bounded, deterministic graph of actual source nodes and edges, with a complete searchable, paginated semantic list. Selecting a node or finding opens its exact file span. File SHA256 and export canonical-payload SHA256 are checked in the browser before display/download. Source is escaped text; tool destinations are declarations, not clickable execution targets. Snapshot, tool and revision hashes remain inspectable.

Only pending connection challenges are periodically polled. Saved source state refreshes on request or when returning to the tab. Session changes remount and clear source state. Expired/withdrawn/denied access removes file contents and stops pending file/export reads while retaining the last verified map as historical metadata in that tab. Every server read independently rechecks authority.

Source-change history retains pending and interrupted checks alongside completed receipts. A newer incomplete check never refreshes the timestamp or verdict of an older unchanged-source receipt. The UI labels comparisons as completed observations at their recorded times. The owner must run a new local check to obtain a newer filesystem observation; the browser only reads saved checks.

Private remote persistence is a separate operator choice. The service requires `FRACTURE_SOURCE_REMOTE_PERSISTENCE=1` before allowing configured remote database persistence of source content; ordinary local storage remains the default. Configuring this does not authorize arbitrary source execution.

## Verification

```sh
npx --no-install tsx --test tests/source-workspaces.test.ts
npm run typecheck
```

Tests use real temporary repositories and private stores: exact content/spans/hashes; actual Bramble source; command non-execution; Python AST non-execution; pending/prepared recovery; concurrent identity and payload conflicts; immutable snapshots after edits; exact change receipts; read-only originals; traversal, source-root replacement, symlinks, hard links, hidden/dependency exclusions, oversize/binary/parser failures, secret boundaries and storage tampering.
