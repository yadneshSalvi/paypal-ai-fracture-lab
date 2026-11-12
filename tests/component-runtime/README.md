# Mounted campaign regressions

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

jsdom has no native dialog top layer; the harness represents opening and an
asynchronous close event. Native browser qualification remains necessary for
visual layout, browser focus behavior, and the complete production journey.
