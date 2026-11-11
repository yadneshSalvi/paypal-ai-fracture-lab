# Context study

This directory contains the corpus, licensed reference materials, executed control qualifications, and preregistration for Fracture Lab's context study. A model result exists only when a sealed study contains `report.json` and its anonymous grades. Control qualification and API binding checks are not model-quality results.

The study schedules 20 tasks × 3 arms × 2 model families × 5 repeats: 600 original candidates, including 300 held out. The five families cover customer-intent duplication, uncertain writes, webhook effects, refund identity/concurrency, and agent retry/error handling. Each family has distinct development and held-out tasks in TypeScript and Python. The tasks were authored with AI assistance for this project; they are not an independently curated external benchmark. Corpus authors saw both splits. No study model sees hidden tests, hardened solutions, or another task's files.

Every arm receives the same task, faulty source, ordinary SDK type declarations, workspace API, and executed public baseline receipt. A has no additional natural-language reference bundle. B receives the declared APIMatic skills/maps. C receives raw official REST operation blocks and schemas in a fixed prefix order. `contexts/provenance.json`, the included licenses, and provider tokenizer receipts record the exact sources, transforms, hashes, and budgets. B and C differ by less than 1% within each provider/language pair. Tokens are not comparable units across providers.

The SDKs are real pinned dependencies: TypeScript `paypal` 2.29.0 at `5d0df8a8817e5fdf2e2cd48e68f790ea4730aab2`, and Python `paypal` 2.29 at `143e57f2a3729d7df3727386b8c9ddf023d9a5df`. Their request encoders, authentication, response decoding, and error classes execute inside a disposable container. The provider transport is a deterministic offline fixture. All payment resources and credentials in these tests are fictional. The study makes no live PayPal request and adds no new provider-fact evidence.

## Execution and integrity

`packages/evaluation/src/world.ts` owns durable SQLite claims and independently records actual SDK wire requests, resource effects, and state at dispatch. `cases.ts` supplies the hidden scenarios and outcome assertions outside the container. The target controls its own claim and request identity; the observer does not repair them. Public and hidden cases run against the same submitted module. The primary pass requires strict compilation, capability policy compliance, and every declared invariant.

Each candidate container has no network or host mounts, a read-only filesystem, nonroot UID, dropped capabilities, 512 MiB memory, one CPU, 96 PIDs, and bounded execution. Candidate stdout is diagnostic only. The trusted SDK bridge uses a dedicated descriptor and per-worker authenticated frames; imports, reflection and private capability access are checked before execution. The qualification includes actual stdout forgery, descriptor-access, timeout, forged-verdict and egress probes. These controls reduce the attack surface; they are not a claim that arbitrary unrestricted code is safe.

The gateway runs outside containers and uses the authorized OpenAI/Gemini keys only in fixed-origin request headers. Every dispatch is durably recorded before transmission. Visible outputs, tool accesses, request IDs where supplied, usage, estimates and failures are retained. Private reasoning is excluded from public evidence; opaque continuation data stays in the private study directory. The separate grading process receives an anonymous candidate ID, task ID, source and frozen hashes, without model/arm labels or provider credentials.

One final source is graded per original candidate. There is no edited-draft execution or quality retry. One retry is allowed after a recorded 429, 5xx, proven pre-response connection failure, or unavailable runner, after 30 seconds. A runner retry reuses the exact original source. Interrupted unknown provider calls are retained without redispatch. Invalid or missing final source is a scored submission failure. The first six executions are original scheduled candidates, never a replaceable pilot.

All 600 candidates must have terminal records before a result seal. Anonymous histories, provider receipts and executed verdicts are checked before the treatment/outcome join. Comparisons remain within the eight model/language/split strata. The bootstrap resamples five task clusters per stratum 10,000 times; pointwise 95% and two-comparison Bonferroni 97.5% intervals are separate. Incomplete strata have no comparison intervals. No rule requires B to win. Five clusters provide limited precision.

## Reproduction

Use Node 22 and `npm ci`. No provider key is needed to verify a public protocol or reproduce a sealed analysis:

```sh
npm run eval:context -- --verify-only --protocol evaluation/studies/fracture-context-2026-11-v1/protocol.json
npm run eval:reproduce -- fracture-context-2026-11-v1
```

The second command requires the published sealed report and anonymous grades. It recomputes every summary field from the original result records without a model or payment call. Exact candidate execution additionally requires the ARM64 runtime image identified by `runtime-lock/manifest.json`. Its archived bytes and image ID are described in `qualification/runtime-archive.json`. A fresh Docker build may differ in underlying OS metadata and is a new runtime requiring qualification; do not label it the original image.

The study coordinator deliberately refuses to regenerate a sealed study or overwrite an attempt. Fresh studies require a new reviewed ID and preregistration. For the original authorized execution, the private `.artifacts/evaluation-studies/<id>/` directory holds assignments and durable request history:

```sh
npm run eval:context -- --study fracture-context-2026-11-v1 --verify-only
npm run eval:context -- --study fracture-context-2026-11-v1 --first-block
npm run eval:seal -- --study fracture-context-2026-11-v1 --verify-only
npm run eval:context -- --study fracture-context-2026-11-v1
npm run eval:seal -- --study fracture-context-2026-11-v1
```

The seal command verifies before publishing data to the local product artifact directory. It does not deploy the application. Per-candidate compressed evidence contains all attempt histories, visible generations and independent runner observations. Prices are estimates from reported token usage, not invoices; unpriced failed calls and unanswered dispatches remain explicit.

`qualification/history/` preserves pre-study development failures as well as final qualifications. Earlier development runs retained summary logs rather than every raw receipt; the log manifest states that granularity. Final 20 faulty and 20 hardened controls have full executed receipts. Changing an evaluator, context, runtime or prompt after freeze invalidates verification instead of silently accepting new behavior.
