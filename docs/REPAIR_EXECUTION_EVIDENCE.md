# Repair execution evidence

The repair panel, evidence drawer and run reports identify the execution boundary from the saved runner receipt. A generated candidate's checks are separate from the original purchase verdict. A passing repair never rewrites a failed purchase or a result in the sealed context study.

The recognized public product suite is `c3e3c478c3af78f82ba966e946cb578ef31b8a039855d920a65402adad190239`: strict compilation and nine published behavioral regressions. Eight raw legacy flags call these checks hidden. The derived `verificationViews` export labels them public while preserving every original evidence record, its hash, wording and flags. Unknown suite hashes or unrecognized runner boundaries receive no derived interpretation.

| Receipt | Observed execution boundary |
| --- | --- |
| Local Docker | User `1000:1000`, no network, no host mounts or forwarded credentials, read-only container root. The receipt ends before cleanup and does not itself establish disposal. |
| Vercel Sandbox | User `candidate`, deny-all network policy, no host mounts or forwarded credentials, read-only reference tree, writable microVM root and a nonpersistent VM. The adapter requires an acknowledged terminal disposal state before accepting the result. |

Candidate, suite, snapshot and original evidence hashes remain inspectable. A cloud receipt also identifies its hosted snapshot and managed image. These facts do not establish live payment behavior or exhaustive sandbox escape resistance.

The separately retained stage8 runner qualification tested the actual v4 candidate against snapshot `snap_Kx4UOuUnD13OfjlkMA1ngw0cadrb`. Its cloud input hash is `a052102ff3f02d0d373b869a11ac78ccc671a67172c6827169815194ea246469`, distinct from the local Docker context hash. The managed runner used Node `22.23.5`; the local runner used `22.22.3`. Snapshot expiry recorded at qualification was `2026-12-12T12:33:09.291Z`; provider snapshots expire 30 days after last use, so the current value differs. Compilation and all nine checks passed, and independent network, immutable-reference, cancellation, timeout and output-limit probes retained their results and confirmed disposal. This direct SDK qualification does not by itself qualify deployed application OIDC or an ordinary hosted judge journey; those remain separate release gates.

## Generated regression test

A model-generated candidate now carries one regression test written by the same model call that authored the source. The test is data, not code: a single declarative purchase case (injected faults, number of attempts for one purchase intent, whether they overlap, and the expected completed captures, paid entitlements and customer state) validated against a strict schema in `packages/isolation/src/generated-test.ts`. A case outside that schema is discarded and the candidate is saved without a generated test.

Verification runs the case in the same isolated boundary as the public suite, in a second disposable container or microVM. A small host-authored harness (its SHA-256 is recorded with every result) loads the pinned runner from the read-only reference tree, loads only the generated case, and reuses the runner's executor and standing assertions unchanged, first against the faulty baseline and then against the candidate. Fail on the baseline and pass on the candidate is recorded as established; any other pair, or a run that could not complete, is recorded as observed and nothing is inferred.

The generated test is additional to the nine public regressions. `packages/isolation/runner/suite.ts` is byte-identical (the suite hash above is unchanged), the frozen suite still runs first and alone decides the verified status, and the patch policy still rejects a candidate that edits a test file or removes an assertion. Because the harness is supplied at execution time, the existing local image and hosted snapshot run it without being rebuilt.

Each generated test is stored as evidence twice: once when authored (not executed) and once per isolated execution. Repairs saved before this change have no such record; the repair view says so and shows their public checks as before.

## Patch policy checks

The strip above the diff shows one pill per check the code evaluates, with its recorded result.

| Pill | Check id | Evaluated by |
| --- | --- | --- |
| Tests and assertions unchanged | `test-integrity` | `inspectPatch` on the diff |
| No secret reads or unapproved hosts | `secret-boundary` | `inspectPatch` on the diff |
| No process, eval or dependency changes | `dependency-boundary` | `inspectPatch` on the diff |
| No swallowed errors | `error-integrity` | `inspectPatch` on the diff |
| One checkout file that parses | `single-file` | `inspectCandidate` on the source |
| Only pinned contract imports | `imports` | `inspectCandidate` on the source |
| No process, global or eval access | `ambient` | `inspectCandidate` on the source |
| No prototype or computed-member access | `reflection` | `inspectCandidate` on the source |
| Only the PayPal sandbox host | `network` | `inspectCandidate` on the source |
| No schema-altering SQL | `store` | `inspectCandidate` on the source |

`inspectPatch` is in `packages/service/src/repairs.ts` and runs when a candidate is prepared. `inspectCandidate` is in `packages/isolation/src/policy.ts` and runs on model-generated source at authoring and again inside the isolated runner, so a verified generated candidate records each source check twice. The human reference and the seeded deceptive patch are checked on the diff only and show four pills. Stored check names and reasons are not rewritten; the full list of recorded evaluations stays available under the strip.

## Report link

`/reports/<run id>` is the stable address of a run report, shown on the report with a QR code drawn locally as inline SVG. Reports are scoped to the judge session that produced them: the link opens the report only in that browser session, and in any other session it shows an explanation and no data from the run. The standalone HTML and JSON exports are the portable copies.
