# Fracture Lab

An evidence-first laboratory for payment integrations. Reproduce a failure, compare what the buyer saw with what the provider recorded, test a diagnosis, and verify a repair against the same purchase invariants.

The original checkout fixture is **Bramble Books**: a fictional $12 digital bookshop. A committed capture loses its answer. The faulty raw-HTTP target says “failed,” then a customer retry creates another approved order and another capture. The hardened reference uses durable operation identity and reads the original order, yielding one capture and one entitlement. The faulty target never passes through the hardened payment core.

The [recorded Sandbox observations](docs/RECORDED_OBSERVATIONS.md) at `/observations` expose the original 11 November comparison without starting a session or making another payment. Its keyboard timeline separates each point’s receipts from later reads and preserves the duplicate charge after compensation.

## Run locally

Requires **Node 22.x**, npm, and PostgreSQL. Set server-only configuration in `.env` using `.env.example`; the minimum for Sample mode is `DATABASE_URL` and a random `JUDGE_SESSION_SECRET`. Never expose those values through `NEXT_PUBLIC_*` variables.

```sh
npm ci
npm run db:migrate
npm run dev
```

Open **http://localhost:4104**. The first visit creates an isolated, signed session and executes the local control plus the first faulty attempt. Press **Try again** inside Bramble to execute the second purchase action. This is a persistent local provider model, visibly labelled **Sample**; it makes no PayPal calls and moves no money.

The optional `/live-bramble` runner uses real PayPal sandbox approvals and original-resource recovery. See [live checkout setup and qualification](docs/LIVE_BRAMBLE.md) for its bounded authority, refund behavior and measured result.

The run page includes participant timelines, a knowledge cursor, resource receipts, eight invariant checks, paired comparisons, compensation, and JSON/HTML exports. Reloading reads the same PostgreSQL records. The interface also exposes projects, integration maps, scenario campaigns, repairs, contract bindings, provider facts, evaluations, evidence and a guided tour.

The [campaign laboratory](docs/CAMPAIGNS.md) saves paired Sample cases before execution, resumes the original identities across workers, and compares only the selected manifest's receipts. Its reduction inspector executes every declared fault-component subset and matching control before certifying a smallest witness. Cancelled and unknown writes retain their partial evidence; they are never replayed or counted as target passes.

The [source workspace console](docs/SOURCE_CONSOLE.md) imports authorized repository snapshots through the private local CLI, maps TypeScript and bounded Python syntax to exact source spans, and retains static risks, tool declarations, hashes and change receipts. The owner approves one read-only browser view at `/sources`. Accepted source stays private in the configured database; remote source storage needs explicit operator opt-in. Importing source does not execute it or establish a reproduced payment defect.

For **Investigate with Astra**, configure `OPENAI_API_KEY`, `OPENAI_PLANNER_MODEL` and `OPENAI_REASONING_EFFORT`. The qualified configuration uses `gpt-6-astra` with `max`. This executes two real Responses API calls around an actual model-selected, scoped SDK resource read. Only read tools are available. Progress, elapsed time, cancellation, attempt records and the resource receipt are persisted. No static answer is presented as generated output.

## Verification

```sh
npm run typecheck
npm test
npm run verify:app -- --build
```

Application conformance runs on PostgreSQL when configured and on an isolated SQLite database. The tests exercise happy paths, distinct-order duplicate purchases, repeated action identities, pending and malformed responses, unavailable reconciliation, historical refunds, session isolation, worker interruption, model tool ownership, private-data exclusion, and cancellation races. A source-hashed artifact is written only after passing checks; stale or missing proof does not become a verified badge.

[`docs/evidence/application-conformance.json`](docs/evidence/application-conformance.json) records the executed application result. [`docs/evidence/model-diagnosis-qualification.json`](docs/evidence/model-diagnosis-qualification.json) records actual model calls against Sample payment evidence. Public PayPal qualification receipts are **separate isolated-account experiments**, not transactions from a current Sample run.

The bounded TypeScript repair executor has a separate local qualification. On macOS it currently requires Docker and a dedicated Colima profile:

```sh
colima start fracture-lab --cpus 2 --memory 2 --disk 15 --root-disk 10 --runtime docker --activate=false --mount none --ssh-agent=false --ssh-config=false --port-forwarder none
npm run prepare:isolation
npm run verify:isolation
```

Preparation builds an explicit public-source snapshot and pinned core archive; it does not copy `.env`, private artifacts, host dependencies or credentials. Each candidate runs as an unprivileged user in a container with no network or host mounts, a read-only root, bounded temporary storage, CPU/memory/process limits and an independent 55-second supervisor. The original compiler, regression harness and provider observations are outside the candidate's allowed edit surface. Static import/reflection checks and a scoped SQL capability add restrictions; they are not a claim of formal JavaScript isolation.

[`docs/evidence/isolation-qualification.json`](docs/evidence/isolation-qualification.json) records the actual inspected container settings and the same ten checks for two **human-authored** candidates: strict compile plus nine scenarios. The original faulty target passes its happy path and fails seven safety cases; the hardened reference passes all checks. The executor accepts one bounded checkout source file. Generated candidates are queued through the web, CLI or MCP and verified independently; generation itself never earns a passing badge. Full local traces remain ignored in `.artifacts/isolation/`.

On Vercel, generation uses durable Workflow continuations and persisted OpenAI background-response IDs. Verification restores a pinned, credential-free Sandbox microVM with deny-all networking; the VM root is writable and reference files are read-only. See [the durable worker and hosted setup](docs/DEVELOPER_TOOLS.md#durable-model-generation-and-hosted-isolation) and [actual isolated runner qualification](docs/evidence/hosted-isolation-qualification.json). Model-generated success and the context study remain separate evidence requirements.

**Errand** executes the installed PayPal Agent Toolkit against an isolated local provider. Its unprotected harness changes request identity after a lost create response, producing two orders; its control retains the same durable identity and observes one. Neither approves or captures an order. The source, wire identities and independent resources are recorded in [the executable qualification](docs/evidence/errand-toolkit-qualification.json). This is a scripted caller with Sample provider resources, not a live payment or model decision. Run it from `/errand` after finishing the current purchase experiment.

## What shipped

The judge path is a ten-step guided tour at `/judge`, in an isolated session with a reset: a Bramble Books checkout loses a capture response, the customer retries and two $12 captures result; eight money invariants catch it; a model diagnoses the cause with a read-only experiment; a generated repair is policy-checked and verified in isolation; the same fault replays on the repaired checkout; the duplicate is refunded; the contract sheet binds each claim to source and a test; and the same loop is available to coding agents.

- **Interactive runs use a local provider model and are labelled Sample.** No PayPal request is made by a Sample run.
- **Real-provider evidence is one recorded PayPal Sandbox pair** (11 November 2026, scenario L2): the faulty checkout captured two distinct buyer-approved $12 orders for one purchase and the duplicate was refunded; the hardened control captured once. It is shown at `/observations`. Further live pairs need a fresh human buyer approval per order and were not produced.
- **Scenarios:** 13 run on click as Sample (S0, S1, S3, S4, S5, S6, S9, S10, A1, A2, A4, A7 on Bramble; E0 on the Errand Toolkit fixture), L2 is the recorded live pair, and 18 unbuilt cases are listed with reasons at `/limits`. See [docs/SCENARIOS.md](docs/SCENARIOS.md).
- **Contract sheet:** rows show "verified" only when the eleven runtime files hash-match `docs/evidence/application-conformance.json`. `npm run check:conformance` runs before every build, so a stale proof fails the deployment instead of shipping.
- **Recorded editor loop** (`/editor-loop`, [docs/editor-loop](docs/editor-loop/README.md)): two separate headless coding-agent sessions built the checkout through the MCP tools. In both, the first submission was inconclusive (0 of 9 checks executed) and the corrected second submission passed 9 of 9; a hand-authored faulty control fails 7 of 9 through the same tools. Neither agent's executed code failed a money invariant, and that is reported as it happened.
- **Repairs** carry a generated regression case that must fail on the faulty baseline and pass on the candidate, in addition to the unchanged public regressions; the policy strip lists the checks the code enforces; reports have a deep link and QR code.
- **Tandem** (Python SDK targets) and **Errand** (installed PayPal Agent Toolkit against the local provider model, scripted caller) remain Sample fixtures.

### How AI uses PayPal

| Step | What the model does | PayPal surface | Boundary |
| --- | --- | --- | --- |
| Diagnosis | Reads the failing run's trace and proposes a cause | Recorded Orders v2 resources from the run (local provider model in Sample) | Read-only; cannot create, capture or refund |
| Toolkit investigation | Chooses one scoped read to test a hypothesis | Installed `@paypal/agent-toolkit` 1.11.0, order read | One read per investigation, rate-limited per session and globally |
| Repair | Writes a candidate patch and a regression case for the Bramble checkout | The pinned APIMatic `paypal` TypeScript SDK through `@fracture/paypal-core` (`PayPal-Request-Id`, reconcile by rereading the original order) | Candidate runs only in a deny-all isolated runner with no credentials |
| Coding agents (CLI / MCP) | Import a checkout, seal a plan, read results | None directly; nine curated checks on the Sample provider model | Owner approves each plan outside the agent |
| Refund of the duplicate | No model involved | Payments v2 refund on the recorded capture | Deterministic, owner-approved, original capture history retained |

### Model roles

| Role | Provider and setting | Used by |
| --- | --- | --- |
| Diagnosis | OpenAI Responses API, `OPENAI_MODEL` | `packages/ai/src/diagnosis.ts` |
| Repair candidate | OpenAI Responses API, `OPENAI_PLANNER_MODEL` | `packages/ai/src/repair.ts` |
| Toolkit investigation | Gemini, `GEMINI_MODEL` | `packages/ai/src/investigations.ts` |

Model names are configuration, verified at deployment; [docs/HOSTED_RUNTIME_QUALIFICATION.md](docs/HOSTED_RUNTIME_QUALIFICATION.md) records the names used in the hosted qualification. No model holds a credential or dispatches a payment.

### Measured results

| Measure | Result | Scope |
| --- | --- | --- |
| Live hero pair | 1 of 1 recorded pair reproduced the duplicate (2 captures, $24 gross, 1 entitlement, $12 refunded) and the control (1 capture) | PayPal Sandbox, 11 November 2026 |
| Application conformance | 38 named checks passed, 0 failed, on PostgreSQL and SQLite; 4 of 4 executable contract rows verified | Local provider model, 12 November 2026 |
| Full test suite | 658 tests: 644 passed, 0 failed, 14 skipped | Local, 12 November 2026 |
| Recorded editor loop | 2 of 2 agent sessions reached 9 of 9 on the second submission; faulty control 2 of 9 | Sample provider model, isolated Docker runner |
| Context study | 600 planned, 301 scored, 299 infrastructure outcomes; all comparisons withheld | Inconclusive. The infrastructure outcomes were traced to a 300-second HTTP header timeout in the study's transport; no comparative claim is made |

No human task times, user quotes or market estimates are reported; none were collected.

### Not in this release

Live scenarios beyond L2, provider-negative application scenarios, a model-driven live Errand, general bring-your-own execution beyond the TypeScript checkout adapter, a hidden regression set, and the public-sample audit. They are listed at `/limits` and are not advertised elsewhere.

The [local CLI and stdio MCP server](docs/DEVELOPER_TOOLS.md) run the Sample scenarios, import authorized source, and queue campaigns, reductions and repair verification through the same service. Initialize with `npm run cli -- init`. The [private remote MCP guide](docs/REMOTE_MCP.md) explains the hosted bridge. How the APIMatic SDK and context plugin were used is documented in [docs/apimatic](docs/apimatic/README.md); the filled integration plan is [paypal-plan.md](paypal-plan.md).

The sealed first context study binds the root `package.json` by hash; reproducing it exactly (`npm run eval:reproduce`) requires the `package.json` of commit `be1c353`.

## Payment boundary

The application consumes the immutable **@fracture/paypal-core 0.2.2** archive in `vendor/`, SHA256 `eb23321fafb98dbf85d3eafdddd249b4c8d50010c5c44f91dd80bc817392d660`. It pins the context-plugin APIMatic `paypal` TypeScript SDK to commit `5d0df8a8817e5fdf2e2cd48e68f790ea4730aab2`. The canonical shared-core source may advance independently; see its [README](packages/paypal-core/README.md) and [provenance](packages/paypal-core/PROVENANCE.json) for the exact current surface and limitations.

Orders, authorization, capture, refund and read operations are distinct from approval experiences, saved-wallet consent, webhooks and other provider APIs. A successful HTTP request or created order is not proof of captured money. Pending and unknown writes remain unresolved. Refunds never erase the original capture history. No unqualified target is protected by a hidden core call or secret retry identifier.

All keys, consent grants and provider credentials stay server-side. Sample execution is the default. Deployments may explicitly enable the bounded Live Bramble runner; each run receives a one-hour, source-bound grant and every distinct order still requires actual PayPal buyer approval. Existing $1 wallet qualification consent was consumed and is not reusable permission for the $12 hero.

## Deployment and provenance

The current hosted checkpoint is [Fracture Lab on Vercel](https://paypal-ai-fracture-lab.vercel.app), backed by PostgreSQL, durable Workflow and isolated Sandbox execution. Node is pinned to 22.x. Runtime artifacts that the application reads are explicitly traced. Local plans, `.env`, `.artifacts`, account data and private evidence stay ignored. 

The included APIMatic context skill retains its upstream license and provenance; see [APIMATIC_SETUP.md](APIMATIC_SETUP.md). Local Geist fonts include their OFL license. Application code is MIT licensed. No synthetic physical outcome, fabricated user feedback, unexecuted evaluation result, or local injection is represented as a live provider fact.

## Python ticket laboratory

The Tandem workspace runs real Python SDK targets, durable comparisons and the reservation lifecycle. See [Tandem Tickets](docs/tandem.md) for the executable scenarios, isolation boundaries, setup and evidence.
