# Fracture Lab

An evidence-first laboratory for payment integrations. Reproduce a failure, compare what the buyer saw with what the provider recorded, test a diagnosis, and verify a repair against the same purchase invariants.

The original checkout fixture is **Bramble Books**: a fictional $12 digital bookshop. A committed capture loses its answer. The faulty raw-HTTP target says “failed,” then a customer retry creates another approved order and another capture. The hardened reference uses durable operation identity and reads the original order, yielding one capture and one entitlement. The faulty target never passes through the hardened payment core.

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

## Implementation and scope

- **Implemented:** authoritative PostgreSQL storage; durable run/action identities and worker leases; independent faulty and hardened Bramble targets; persistent local orders, captures and refunds; S0, S3, S4, S5, S10 and A4 executors; Errand E0 actual Toolkit/local-provider comparison; invariant evaluation; scoped API; genuine model diagnosis; durable generated-candidate and isolated verification queues; labelled reference/deceptive repair inspection; comparisons and compensation; reports and connected interface.
- **Qualified later units:** actual generated-candidate verification against ten unchanged public checks; durable isolated Python Tandem comparisons; the browser-approved live Bramble L2 baseline, hardened control and duplicate compensation. Each unit has its own scoped evidence document.
- **In progress:** the remaining live and provider-negative application executors, live Errand behavior, expanded CLI/MCP execution capabilities, campaign recovery, minimization and broader source analysis.
- **Unmeasured:** the 600-attempt three-arm context study, 12-revision public sample audit, and five actual user sessions. Their outcomes remain blank until executed. The evaluation protocol is currently a draft, not falsely frozen.

The baseline is eight live-resource cases, three provider-negative cases and twelve local cases. Seven proposed additions target 30 qualified cases. S0 is the introductory walkthrough and is excluded from that denominator. A visible scenario definition is not an executed capability: gated cases show the missing proof.

The [local CLI and stdio MCP server](docs/DEVELOPER_TOOLS.md) execute qualified Sample scenarios and queue generated repair/verification through the same service, with private expiring grants, owned reports and immediate revocation for subsequent calls. Initialize with `npm run cli -- init`. Arbitrary-workspace and live-payment tools remain pending.

## Payment boundary

The application consumes the immutable **@fracture/paypal-core 0.2.2** archive in `vendor/`, SHA256 `eb23321fafb98dbf85d3eafdddd249b4c8d50010c5c44f91dd80bc817392d660`. It pins the context-plugin APIMatic `paypal` TypeScript SDK to commit `5d0df8a8817e5fdf2e2cd48e68f790ea4730aab2`. The canonical shared-core source may advance independently; see its [README](packages/paypal-core/README.md) and [provenance](packages/paypal-core/PROVENANCE.json) for the exact current surface and limitations.

Orders, authorization, capture, refund and read operations are distinct from approval experiences, saved-wallet consent, webhooks and other provider APIs. A successful HTTP request or created order is not proof of captured money. Pending and unknown writes remain unresolved. Refunds never erase the original capture history. No unqualified target is protected by a hidden core call or secret retry identifier.

All keys, consent grants and provider credentials stay server-side. Sample execution is the default. Deployments may explicitly enable the bounded Live Bramble runner; each run receives a one-hour, source-bound grant and every distinct order still requires actual PayPal buyer approval. Existing $1 wallet qualification consent was consumed and is not reusable permission for the $12 hero.

## Deployment and provenance

The current hosted checkpoint is [Fracture Lab on Vercel](https://paypal-ai-fracture-lab.vercel.app), backed by PostgreSQL, durable Workflow and isolated Sandbox execution. Node is pinned to 22.x. Runtime artifacts that the application reads are explicitly traced. Local plans, `.env`, `.artifacts`, account data and private evidence stay ignored. A hosted checkpoint does not imply every planned capability is complete.

The included APIMatic context skill retains its upstream license and provenance; see [APIMATIC_SETUP.md](APIMATIC_SETUP.md). Local Geist fonts include their OFL license. Application code is MIT licensed. No synthetic physical outcome, fabricated user feedback, unexecuted evaluation result, or local injection is represented as a live provider fact.

## Python ticket laboratory

The Tandem workspace runs real Python SDK targets, durable comparisons and the reservation lifecycle. See [Tandem Tickets](docs/tandem.md) for the executable scenarios, isolation boundaries, setup and evidence.
