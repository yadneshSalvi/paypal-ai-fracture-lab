# The APIMatic PayPal Context Plugin in this repository

## Identity and provenance

| Fact | Value | Where recorded |
|---|---|---|
| Plugin | PayPal Context Plugin (`paypal`), version 0.4.1, by APIMatic, MIT | [`.agents/apimatic-paypal/plugin.json`](../../.agents/apimatic-paypal/plugin.json) |
| Source | `context-plugins/plugin-marketplace` at commit `7cbdf85dc95f09d9ede8c5d349506686684fa0d4` | [`.agents/apimatic-paypal/provenance.json`](../../.agents/apimatic-paypal/provenance.json) |
| Installed on | 10 November 2026, scoped to this repository (no user-wide registration) | same file, `installed_on` and `installation_mode` |
| Content | 29 skills in 32 files: 9 TypeScript, 11 Python, 9 .NET | [`.agents/skills/`](../../.agents/skills/) |
| Integrity | Each file's Git blob SHA-1 and SHA-256 is listed against its upstream path | `files[]` in `provenance.json` |

[`APIMATIC_SETUP.md`](../../APIMATIC_SETUP.md) gives the installation method and a command that reproduces it. The plugin contains skills only. It needs no APIMatic account, API key or running service.

To check the recorded hashes against the installed files:

```sh
node -e 'const c=require("crypto"),f=require("fs");const p=require("./.agents/apimatic-paypal/provenance.json");const bad=p.files.filter(x=>c.createHash("sha256").update(f.readFileSync(x.installed)).digest("hex")!==x.sha256);console.log(p.files.length+" files, "+bad.length+" mismatched")'
```

## Which skill informed which code

The contract records that all nine TypeScript skills were read before the adapter was written ([`paypal-plan.md`](../../paypal-plan.md), "Required reading" list at lines 138 to 146). The table below pairs a statement in each skill with the code that follows it. Line numbers refer to the files at the time of writing.

| Skill | What it states | What the code does |
|---|---|---|
| `typescript-integrate-paypal`, `typescript-getting-started` | The SDK is the package `paypal`, imported only from its root, and its generated map (`sdk-map.md`, `map/operations/*.md`) ships inside the installed package | One import site for the client, [`provider.ts:2`](../../packages/paypal-core/src/provider.ts#L2). The contract's signatures and field tables were resolved from `node_modules/paypal/sdk-map.md` and the Orders, Payments and Transaction Search operation maps. Those map files are also traced into the deployed repair context ([`apps/web/next.config.ts`](../../apps/web/next.config.ts), `repairContextFiles`) |
| `typescript-client-initialization` | Build one client from a `ClientOptions` object; `fetch` is the one transport seam | One client per adapter, built in the constructor with an optional injected `fetch`: [`provider.ts:74-78`](../../packages/paypal-core/src/provider.ts#L74) |
| `typescript-authentication` | Client-credentials OAuth is configured on the client; a failed token request surfaces from the operation call as an auth error, even with `.asApiResult()` | `oauth2:{clientId,clientSecret}` at [`provider.ts:76`](../../packages/paypal-core/src/provider.ts#L76). An auth error is recorded as never sent, with no payment read or write: [`provider.ts:62`](../../packages/paypal-core/src/provider.ts#L62), test at [`tests/paypal-sdk.test.ts:182`](../../tests/paypal-sdk.test.ts#L182) |
| `typescript-calling-endpoints` | Each operation takes one flat request object; `.asApiResult()` returns error statuses as values instead of throwing | Every call uses `.asApiResult()` and passes `payPalRequestId` and `prefer` beside `id` and `body`: [`provider.ts:104-148`](../../packages/paypal-core/src/provider.ts#L104) |
| `typescript-models` | Request bodies are plain object literals; optional members are omitted, not set to null | Order, capture and refund bodies are built as literals with conditional spreads: [`provider.ts:114-121`](../../packages/paypal-core/src/provider.ts#L114). Wire shape asserted at [`tests/paypal-sdk.test.ts:32`](../../tests/paypal-sdk.test.ts#L32) |
| `typescript-error-handling` | SDK errors form one family with a closed `kind`: `api`, `auth`, `encode`, `decode`, `connection`, `timeout` | One `switch` on `kind` maps each arm to rejected, never sent or unknown: [`provider.ts:56-68`](../../packages/paypal-core/src/provider.ts#L56). Anything outside the family is rethrown |
| `typescript-configuration-resilience` | Retries are on by default (GET, HEAD, PUT, OPTIONS on 408, 429 and 5xx); `retry:{maxRetries:0}` turns them off; a caller cannot set the `Idempotency-Key` the SDK mints | Retries off and logging off: [`provider.ts:76`](../../packages/paypal-core/src/provider.ts#L76). Recovery is an explicit reread by the payment core, never an SDK retry. The minted key is not relied on, see [FINDINGS.md](FINDINGS.md#1-the-sdks-idempotency-key-does-not-deduplicate-paypal-create-order) |
| `typescript-testing` | Fake the transport through `ClientOptions.fetch`, answer in wire shape, assert the request the SDK built, and set `maxRetries: 0` | Every SDK test injects `fetch` and asserts paths, headers and bodies: [`tests/paypal-sdk.test.ts`](../../tests/paypal-sdk.test.ts), [`tests/contract-bindings.test.ts:49-56`](../../tests/contract-bindings.test.ts#L49) |

The Python skills were used the same way for the Tandem fixture, which calls the APIMatic Python SDK (`paypal` 2.29 at `context-plugins/paypal-python-sdk@143e57f`, pinned in [`apps/fixtures/tandem/requirements.txt`](../../apps/fixtures/tandem/requirements.txt)) from [`apps/fixtures/tandem/sdk_adapter.py`](../../apps/fixtures/tandem/sdk_adapter.py). Its wire tests are recorded in [`docs/evidence/tandem-sdk-wire-qualification.json`](../evidence/tandem-sdk-wire-qualification.json). The .NET skills are installed and unused.

## The plugin inside the product

The skills are not only build-time reading. When the product asks a model to repair a checkout, the TypeScript skill files and the SDK's operation maps are part of the context the model may be given (`../../.agents/skills/typescript-*/SKILL.md` in `repairContextFiles`, [`apps/web/next.config.ts`](../../apps/web/next.config.ts)). The context study under [`evaluation/studies/`](../../evaluation/studies/) was designed to compare model repairs across context arms; what it did and did not establish is reported in [`docs/evaluation/CONTEXT_STUDY_RESULTS.md`](../evaluation/CONTEXT_STUDY_RESULTS.md) and on `/evaluations`.

## What is not claimed

- The record that a skill was read is the contract's own statement plus the correspondence above. There is no machine log of an agent loading each skill.
- Provenance proves the installed files equal the upstream commit. It says nothing about the quality of the skills.
