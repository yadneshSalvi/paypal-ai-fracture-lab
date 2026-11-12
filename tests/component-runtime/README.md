# Mounted application regressions

The original research protocol hashes the root dependency lock. DOM test tools
therefore have their own pinned manifest and lock in this directory.

From the repository root:

```sh
npm ci --prefix tests/component-runtime --ignore-scripts
npm test --prefix tests/component-runtime
```

These tests mount the actual `CampaignLab`, `WorkspaceProvider`, and Next.js
navigation contexts in jsdom. They exercise delayed acknowledgements, reduction
completion, cancellation, unknown-outcome recovery with the original request,
pending dispatch, and modal dismissal. Fetch responses are explicitly controlled
test receipts. No payment, model, database, or network provider is called.

The Source Atlas suite mounts the actual `SourceAtlas` and provider in its
source-only navigation context. It checks empty/loading approval, exact-snapshot
connection, same-request recovery, denied/revoked reads removing source text,
late-response fencing, real SHA256 checks, keyboard/inspector focus, changed
session isolation, strict mounting and dated interrupted source-check history.
Source and API responses are explicitly controlled DOM fixtures; compiler,
filesystem, SQL and route behavior have separate real tests. Imported code is
never evaluated by this suite.

Run just the source component regressions from the repository root:

```sh
node node_modules/tsx/dist/cli.mjs --test tests/source-component.dom.ts
```

jsdom has no native dialog top layer; the harness represents opening and an
asynchronous close event. Native browser qualification remains necessary for
visual layout, browser focus behavior, and the complete production journey.
