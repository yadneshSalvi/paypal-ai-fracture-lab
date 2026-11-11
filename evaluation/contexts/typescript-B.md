# Frozen APIMatic SDK guidance

Language: typescript. SDK source commit: 5d0df8a8817e5fdf2e2cd48e68f790ea4730aab2. Skills source commit: 7cbdf85dc95f09d9ede8c5d349506686684fa0d4. These source excerpts retain their upstream spelling. The candidate workspace contract controls what can be changed or executed.

The MIT License (MIT)

Copyright (c) 2026- APIMatic

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.



<!-- Source: .agents/skills/typescript-integrate-paypal/SKILL.md; MIT; original SHA-256 ea3d3a49a5e5250334aaa2316f7e11d8e508c2d66ad31c33477f53521eafc126 -->

---
name: "typescript-integrate-paypal"
description: "MANDATORY FIRST STEP for Paypal TypeScript SDK work in a TypeScript or JavaScript project — load this BEFORE you write any code; TypeScript SDK ONLY, never load it for any other language. Applies when asked to integrate Paypal in TypeScript/Node — authorize order, capture order, confirm order, create order, create order tracking, get order, or when the Paypal TypeScript SDK errors, fails to compile, or behaves unexpectedly. Knowing the SDK exists is NOT a substitute for loading this, because it carries five binding gates stated NOWHERE else and not inferable from the package — (1) load typescript-getting-started, confirm `paypal` actually resolves and read the SDK map that ships inside it before any lookup, (2) the exact plan-file path (paypal-plan.md at the repo root) and the no-project-file-edits window until a contract sheet with no open lookups exists there and you have read it, (3) the mandatory load of every typescript-* companion skill the sheet names, (4) the host decision, which this SDK forces once and irreversibly — it declares one environment and no ServerEnvironment, so any other host is a serverOptions base-URL override rather than an environment member, and (5) the memory ban, where every signature, request field, channel, header default, error arm and enum member comes from a lookup and never from recall or runtime introspection."
---

# Paypal TypeScript SDK — Integration workflow (lookup layer + contract sheet)

You do the SDK lookups yourself: `typescript-getting-started` is your **lookup layer** — load it and ground every contract fact in it (and in the source files its table names) before writing code. The `typescript-*` companion skills are a different thing: they are API-agnostic *usage* guidance, they are yours to load, and Step 1c below makes loading them mandatory.

## Your lookup layer

- **`typescript-getting-started`** is the entry point for every SDK need. It carries the SDK's identity (package name, version, Node floor, how it installs), the single import specifier and what the root exports, the server environments and the base-URL knob, the auth pattern, the resources, and a **file table** naming the one file that owns each kind of fact. Load it first, always.
- **The SDK map is your lookup surface, and you open it yourself.** The SDK ships `sdk-map.md` and `map/operations/` at its package root — and because `package.json`'s `files` list includes them, **installing the package puts the map in `node_modules/paypal/`**. There is nothing to clone and no helper agent to delegate to. `typescript-getting-started` tells you how to traverse it: read `sdk-map.md` once, then the one resource page your operations live on.
- **The installed package is the ground truth; the file table is only the locator.** Confirm it resolves before you rely on a lookup — `node -e "console.log(require.resolve('paypal/package.json'))"`. **If the resolve fails, or the directory it prints carries no `sdk-map.md`, the map is still in the SDK's own repository** — <https://github.com/context-plugins/paypal-typescript-sdk>, branch `main`. Read it there, and only if neither route yields a map mark the fact `UNVERIFIED`, say what would settle it, and do not fill the hole from memory. This SDK is **not published to a registry**, so the install is a build from its source — <https://github.com/context-plugins/paypal-typescript-sdk>. `typescript-getting-started`'s *Install* section carries what to run.
- **Read scoped.** Search for the one symbol and read the lines around it rather than whole files, and never copy a design comment's rationale onto a contract sheet — the sheet carries facts an implementer must obey, not the reasoning behind them.
- **Write a contract sheet with no open lookups** before you implement: exact signatures with the right request type name, every request field with its channel, wire name and default, required-vs-optional-vs-nullable members, the error arms per operation with the status each covers, and enum members for the operations in scope. `typescript-getting-started` ends with a checklist of what a sheet for this SDK is incomplete without — treat that as the checklist for your own sheet, and collect every in-scope operation in ONE pass rather than re-opening a map page per field.

**Scope guard:** the APIMatic-generated Paypal **TypeScript SDK** (package and import specifier `paypal`, client `PaypalClient`) in **TypeScript or JavaScript projects only**. Unrelated API, or any language other than TypeScript/JavaScript — do nothing; this skill does not apply.

## Workflow

**If the user opens with a reported SDK error, a compile failure, or unexpected Paypal behaviour** (not new feature work), skip the plan-first flow: load `typescript-getting-started` and `typescript-error-handling`, look the failing symbol up on the map page or in the file the table names, and fix from what you find. Otherwise, for implementation work:

### Step 1 — Plan first (always, for any implementation work)

Your FIRST action is to load `typescript-getting-started` and work through the user's full request (all features in scope — one plan covers the whole implementation). Load `typescript-error-handling` before you write the plan too: table 1b.4 is decided from it. Then write the plan and its contract sheet to `<project repo root>/paypal-plan.md` — that absolute path, not a location you pick later.

**Do the read-only prerequisites in the same pass — they need no SDK knowledge and touch no project file:**

- the repo survey (read-only exploration of conventions, layering, **module format — ESM or CJS, which changes how the SDK is imported and whether `instanceof` on its error classes is trustworthy**, and the runtime: Node, a bundled browser app, or an edge runtime) — capture each convention as *pattern + the ONE exemplar file path to imitate*, NOT inline code snippets: you will read the exemplar at edit time anyway, so a snippet dump gets paid for twice;
- **establish the toolchain before you need it**: the package manager, whether `paypal` is already a dependency and at what version, the `tsconfig` flags that change what compiles here (`exactOptionalPropertyTypes`, `verbatimModuleSyntax`, `strict`), and the exact commands that run the project's build, type check, lint and tests. Getting this wrong later costs a broken install mid-implementation — and an uninstalled package costs you the lookup layer itself, since the map ships inside it;
- a baseline run of the project's checks (`tsc --noEmit`, the test runner, the linter — whatever it has) on the UNTOUCHED tree, so later failures are attributable to your changes;
- credentials/environment verification (per the task's secret-handling rules) — **including which host this deployment will actually talk to**, since this SDK declares exactly one environment, so it emits no `ServerEnvironment` at all and **any other host is a `serverOptions` base-URL override rather than an environment value**;
- **a read-only smoke of each in-scope operation against the real credential**, run from your scratchpad, not the project, once the map has given you the signatures and before you finalise the sheet. A plan-, region- or entitlement-gated endpoint answers `403` here — the map presents every operation uniformly and cannot know which ones your credential may call — and learning that now reorders the plan rather than the build. Skip only operations whose side effects you cannot reverse;
- setting up your task tracking.

Never use the planning phase to get a "head start" on implementation: **creating or editing ANY project file before the gate below is a defect**, no matter how obvious the code seems.

**HARD GATE — no project-file creation or edits until:** `paypal-plan.md` EXISTS at the repo root, its contract sheet has **no open lookups**, and you have read it. The gate bars coding "meanwhile"; it does not bar the read-only prerequisite work above. Starting to code before the sheet exists defeats the entire plan-first design.

**What the gate does not cover:** installing `paypal` into the project, installing the toolchain, and the files those writes produce (`node_modules/`, a lockfile the installer updates) are **prerequisites, not project-file edits**. On a greenfield repo they are the only way to reach the lookup layer at all — the map lives inside the installed package — and they are the only writes permitted before the gate. Nothing you author by hand may change.

### Step 1b — The tables the contract sheet must carry (fill these in before you write any code)

The per-operation rows describe **what each operation is**. The tables below carry what those rows cannot: a write that may reach the provider twice or whose outcome you may not learn, a rule that spans two operations, and a field nobody asked for. Fill in every one that applies before any code exists.

#### 1b.1 — DURABLE WRITES

One row in each table below per operation in scope that creates, sends or changes something on the provider's side; `none` if the scope has no such write. Every row follows one order: **claim → SDK call → record the result**. The claim is a row of its own, committed to a store this application owns *before* the call — not a field filled in afterwards on the record the write is about — so a second caller is stopped before it reaches the provider, and a lost answer leaves something to settle. A test that reads the store from inside the faked `fetch` shows the claim was there when the request left.

**DUPLICATE CLAIMS** — what stops the same operation reaching the provider twice.

| Write | Where the claim is stored | What rejects the second one | Where that rejection is caught | Where in the code |
| --- | --- | --- | --- | --- |

⚠⚠ **What rejects the second one**: the store refusing the second claim — a unique constraint or a conditional write on a value every caller doing the same operation computes the same (the order being paid, the signup being welcomed), never on a value minted per attempt, which is unique by construction and refuses nothing. A read before the write, an in-process lock, or an assumption that one process runs lets both callers through. Release the claim when the provider refuses the call, so a later attempt is not blocked.

**Where that rejection is caught**: the `catch` for what the store raises on the second claim, recognised by the driver's error code rather than its message; the losing caller then uses the record the winner wrote.

The SDK sends an `Idempotency-Key` minted once per call, and its own retries resend that key — but a second click or a retry of your own is a new call with a new key, so the provider cannot join the two. The key goes beside the claim, never in place of it; where the operation declares its own key, send the reference stored on the claim (see `typescript-configuration-resilience`).

**UNKNOWN OUTCOMES** — what settles a write the provider may have acted on without your code learning the answer.

| Write | The operation you re-read with | The reference you search by | Where in the code | The test that fails the connection |
| --- | --- | --- | --- | --- |

⚠⚠ A `ConnectionError` or `TimeoutError` on a write is *unknown*, not *failed*: the provider may already have acted. Reporting a failure is not a legal entry, and neither is leaving the caller to check or retry. Settle it in that write's own `catch`: re-read by the reference you sent — found, settle from what the provider holds; not found, or the re-read itself fails, still unknown, never failed. Telling the caller the outcome is unknown comes after the re-read, never instead of it. If the provider offers no way to find the write, that is a **Blocker** in Assumptions & Blockers, not a row.

A write that never left has nothing to re-read — a credential that could not be obtained (`AuthError`) or a value that would not encode (`EncodeError`) — and must reach a different outcome. Re-reading after every error is not the safe default: "any error might mean it went through" is false for a request that never left, so a refused credential gets its own outcome and no re-read. **The test that fails the connection** asserts the re-read request was made; a second test, a never-sent failure on the same write, asserts it was not.

Write `TBD` in **Where in the code** and **The test that fails the connection** while you plan — every row. Once the code compiles, replace each `TBD` individually: the claim write, then the SDK call it precedes; the `catch`, then the re-read it makes. ⚠⚠ A `TBD` left behind, a name that is not in the code, or one note covering several rows is **not addressed**; if the code does not do what the row says, fix the code, then the cell.

#### 1b.2 — CROSS-OPERATION INVARIANTS

**CROSS-OPERATION INVARIANTS** — copy this header into the contract sheet and add one row per value a caller supplies (an identifier, a code, a reference) whose legal set something other than that call defines: a list the provider returns, or records this application keeps. `none` if the task restricts no such value. ⚠⚠ The map never states these rules; derive them from the task.

| Invariant | Where the legal set comes from | Enforced where | The test that proves it |
| --- | --- | --- | --- |

⚠⚠ **The legal set is the one this task offers, not everything the account holds.** Asking the provider whether a value exists is not this check: the provider already rejects what exists nowhere, so a lookup of one record by its id enforces nothing new — internal records, test records and records meant for something else all exist, and all pass it. Check membership of the offered set itself, read in full (every page). If neither the provider nor this application can name that set, that is a **Blocker** in Assumptions & Blockers, not a row.

The check runs before the write is attempted and before its **DUPLICATE CLAIMS** claim is inserted — a value rejected after the claim exists leaves the claim behind to block a later, legitimate attempt. **The test that proves it** asserts a value outside the set is rejected **and** the write is never called.

#### 1b.3 — OPTIONAL REQUEST FIELDS

For every write operation in scope, the contract sheet carries an **OPTIONAL FIELDS** table: one row per optional field on the request, and what **requires** it.

| Field | What requires it | Set it? |
| --- | --- | --- |
| `{optionalField}` | nothing | ❌ leave it out |
| `{optionalField}` | the words in the task that supply it | ✅ set it from those words |
| `{optionalField}` | a named row of this sheet — e.g. the idempotency key a DUPLICATE CLAIMS row sends, or the reference an UNKNOWN OUTCOMES row searches by | ✅ set it, and name that row here |

⚠⚠ **A field nothing requires is not yours to choose** — and "something requires it" means the task's own words or a row of this sheet, never your own sense that it looks sensible. Leaving it out *is* the decision: the provider's own default then applies, whether that is the account's configuration or the API's documented behaviour, and neither is yours to replace with a value you invented.

⚠⚠ **This rule never removes a field another row requires.** An idempotency key, and the reference you look an unknown outcome up by, are required by the DUPLICATE CLAIMS and UNKNOWN OUTCOMES rows rather than by the task — the task will never mention either. Dropping one to satisfy this table is a defect, not compliance. And because a header, a query parameter and a body field all look alike on this SDK's flat request object, "it is only a header" is not a reason to leave a field off the table.

⚠⚠ **The map does not state defaults, and its silence is not permission to pick one.** A member typed `field?: T` tells you the field may be omitted. It tells you nothing about what omitting it does. If you cannot state what the provider will apply when the field is absent, that is a reason to leave it absent, not a reason to fill it.

**The test that proves it:** assert the request the SDK sent carries **no key your own code set without a row that requires it** — headers and query parameters included, not only the body. The SDK adds its own (authorization, content type, its defaults); those are not yours and need no row. A test that only checks the fields you meant to send cannot see an invented one.

#### 1b.4 — WHEN THE API SAYS NO

Add one table per operation that uses the caller's data — what they typed, IDs they supply, and data your app stores for them (their email, their name). An empty request body does not make a refusal yours: when the API refuses the data you sent for them, only its reason tells them what to change. An operation with no typed arms still gets one.

| status | your app answers | the caller reads | test |
| --- | --- | --- | --- |
| a `4xx` other than 401 / 403 / 429 | the same `4xx` | the API's reason text from `err.payload` | fake it with a reason; assert the reason is in your response |
| 401 / 403 | 502 | a fixed message — our credentials | fake a 401; assert 502 and the fixed message |
| 429 | 503 | a fixed message — our quota | — |
| 5xx | 502 | a fixed message | — |
| no response, on a write | per UNKNOWN OUTCOMES | unknown — never "failed" | — |
| no response, on a read | 502 | a fixed message | — |

Logging the reason is not returning it: log it **and** put it in the response.

### Step 1c — Required reading (do this before you write any code)

End the contract sheet with a **REQUIRED READING** block whose rows carry inline `MUST load <skill>` pointers. **Load every `typescript-*` skill the sheet names, now, before you start implementing** — not lazily at the step that needs it. The sheet deliberately does *not* carry the how-to: it names the hazard and hands you the skill that resolves it, so an unloaded pointer is a gap in what you know, not a formality.

**A fixed floor applies regardless of what the sheet says** — the sheet can add to it, never remove from it: `typescript-error-handling` always (every integration writes an error boundary, and this SDK's one error family is narrowed on its closed `kind`, with four throwables outside it that a family test has to rethrow); `typescript-client-initialization` before the client is constructed; `typescript-testing` before the first test file you create or edit, *including* a throwaway verification script that fakes `fetch`. A sheet row that excuses one of these ("out of scope", "no test suite requested") is not a substitute for loading it.

These are API-agnostic usage skills; loading them is not a substitute for the lookup layer, and reading a file in the installed package does not remove the need to load the skill for that step. Contract *facts* still come only from your sheet or a fresh lookup.

Before implementing, check the plan's **Assumptions & Blockers** section:

- Blocker or major assumption → surface it to the user in plain language, get their answer, and revise `paypal-plan.md` in place.
- Minor assumptions only → proceed.

Full re-planning only on genuine scope change; for a single missing fact mid-implementation, do the lookup, never guess.

### Step 2 — Implement from the contract sheet

1. Read `paypal-plan.md` once. Treat its contracts as authoritative — do not re-derive or "double-check" them from memory. When a lookup revises a row, update the file so the sheet and the code never disagree.
2. **Decide which host this deployment talks to, explicitly, before the first call.** This SDK declares one environment and emits no selector for it, so a different host is a `serverOptions` base-URL override. Nothing in the options then records **which** deployment this is, which is precisely the shape of configuration that gets a live secret aimed at a test host or the reverse. Bind it to configuration and fail startup if the (host, credential) pair is not the one this deployment intends.
3. **Build the client once and hold it.** Resources are memoized lazy getters on it and the OAuth 2 token cache lives on it, so rebuilding one per request throws that state away. There is no `close()` — it owns a `fetch`, not a pool.
4. **Pick the response mode per call, deliberately.** Every operation returns `ApiPromise<T, E>`: `await` it and an error status rejects, or call `.asApiResult()` **on the value the operation returned** for the non-throwing `ApiResult<T, E>` — the only way to see the status and headers of a *success*, and therefore the only way to observe anything at all from the **11 operations that resolve to `undefined`** (every operation whose success declares no body — the map's **Returns** bullet names them). `ApiPromise` overrides `Symbol.species`, so `.then()`/`.catch()`/`.finally()` hand back a plain `Promise` with the method gone — the mode is chosen at write time, never retrofitted.
5. Implement sequentially, following the repo's own conventions and layering. You loaded the companion skills the sheet named in Step 1c — implement each step in line with the one that governs it. Take every contract *fact* (signatures, field names, channels, error arms, enum members) from the contract sheet or a fresh lookup — never re-derive one from a companion.
6. After every change: run the project's **type checker** (`tsc --noEmit`) as well as its tests. The package ships its own types and is generated under strict TypeScript, so a type error against it is a real contract violation, not noise — it is the compile-time backstop the whole map-first discipline leans on. **Treat a clean type check as the gate you do not skip.** If the project has no type check configured, run `tsc --noEmit` over the files you touched; if you genuinely cannot, say so in your final report rather than silently substituting a smoke run. Fix non-SDK errors yourself.
7. **Any error involving an SDK type or member** — `TS2339` (property does not exist), `TS2345`/`TS2322` (argument or assignment mismatch), `TS2551` (did you mean), `TS2307` (cannot find module — usually a deep import), `TS2739`/`TS2741` (missing required members), or an unexpected rejection at runtime — → go back to `typescript-getting-started`'s map section and file table, and read the one page or file that owns the fact. Do not attempt more than one self-fix of an SDK-name error before doing that lookup: rewriting from the same knowledge that produced the error is guessing. Remember which failures are **not** `ApiError`: a malformed body is `DecodeError`, a value that would not encode `EncodeError`, a dropped connection `ConnectionError`, an attempt's timeout `TimeoutError` (both only after any retries are spent), a credential that could not be **obtained** `AuthError` — every one of them in the `PaypalError` family, told apart by `err.kind`. So an exception that does not look like an API error may still be one of the SDK's failure kinds.
8. Once the code is complete, open each member the **DUPLICATE CLAIMS** and **UNKNOWN OUTCOMES** rows name and confirm it runs when that write runs. Where the code falls short of a row, fix the code, not the row.
9. **Observability and sensitive data.** Logging is **off by default** and is configured through `ClientOptions.logging`: say whether the integration turns it on, at what level, and which correlation id from the provider's error bodies reaches your own logs. A JSON request body is logged **verbatim** when `logRequestBody` is on, and a form body is masked only by deny-list, so a key you have not listed prints in the clear. If the scope carries data you would not want in a log — each request model's declaring file lists every field in scope — `logRequestBody` stays off, no call on those paths passes a per-call level, which turns the body on, **and** `ClientOptions.logging.level` is set explicitly, so the `PAYPAL_CLIENT_LOG` environment variable cannot switch logging on from outside the code (see `typescript-getting-started`).
10. Run the project's tests; verify the integration end to end the way the task demands. Retrying is **on by default**, so if the task needs a different policy, tune it through `ClientOptions.retry` rather than wrapping the call. The SDK has no hooks or middleware, so anything the task needs there is yours to build on the `ClientOptions.fetch` seam or to deliberately omit — say which you did for both.

### Step 3 — Answering pure questions

A standalone Paypal question with no code change: look it up in `typescript-getting-started` (and the map page or file its table names), then give the grounded answer, citing where it came from. When several questions arrive batched, answer them in one pass. Never answer from memory, even for "easy" questions.

## Anti-patterns — never do these

- **Always load `typescript-getting-started` first.** It is your lookup layer, not optional background. (The `typescript-*` companions are the complement: load the ones the sheet names, per Step 1c.) Don't re-derive a contract *fact* from a companion — exact signatures, request fields, channels, error arms and enum members come from the sheet or a fresh lookup.
- **Never write any Paypal or SDK fact from memory** — every signature, field name, wire header, enum member, and error arm in your code must come from the contract sheet or a lookup. And **never write a call from memory "to fix later".**
- **Never switch on an error arm tag across operations.** A tag is derived from the arm's **body schema**, never from its status: an arm whose body is a direct model reference is named after that model in lower camel (`"validationError"`), and every other body — a primitive, an array, a map, or no content — is named `"error{Status}"` (`"error400"`, `"error4XX"`, `"errorDefault"`), with a numeric suffix on the second of two arms that would otherwise land on the same name. Tags are resolved **per operation**, so the same tag covers different statuses on different operations — a shared handler keyed on `err.payload.kind` is a bug. Read the status from `err.status`, and narrow on `kind` only against the arm table of that one operation.
- **Don't web-search Paypal topics to find an implementation detail** — the installed package's own map and source are the ground truth, and the file table tells you where to look. Public Paypal docs describe the HTTP API, not this SDK's generated surface, and the two disagree on names, on which fields are required, and on what the SDK sends by default.
- **Never introspect the SDK at run time to discover its shape.** `Object.keys`, logging a client instance, or a REPL poke is the TypeScript-flavoured version of decompiling the package: it answers what exists, never what is *supported*, and it invites `#`-private fields and unexported engine types into your code. Read the map, then the file it names.
- **Don't grep the package to *locate* a type** — the SDK map is the locator (and says so: *"Do not derive the path from the type name"*); grep only *inside* the file its **Type sources** table names, for the symbol. A sweep for a *shape* is a different thing, and is fine: "every field typed `unknown`", "every required-nullable member" are cross-cutting questions nothing indexes, and one targeted `grep -rn` over `src/models/` is the right tool for them — record what it found on the sheet.
- **Don't deep-import from the package** (`paypal/models/…`). The package root is the only entry and deep specifiers do not resolve; the map's `Source` paths are for reading, not importing.
- **Don't import `Error` unaliased.** This SDK exports a type named after a TypeScript/DOM global, so importing it plain shadows the global for the whole file. Alias on import from `paypal`.
- **Don't vendor the SDK's `src/` into the project, point `tsconfig` `paths` at a throwaway clone, or import from `dist/` directly** to make a lookup possible. Install it properly (see `typescript-getting-started`); a clone-based shortcut breaks every import the moment the clone is deleted, and it does not put the map where the lookups expect it.
- **Don't create or edit project files before the HARD GATE** in Step 1 — plan and contract sheet first, code second.




<!-- Source: .agents/skills/typescript-getting-started/SKILL.md; MIT; original SHA-256 45d9af1d1181f8af0ff4a0a1d7cb8cf80d30c5a9542796e142e9e60b5a778773 -->

---
name: "typescript-getting-started"
description: "Paypal TypeScript SDK identity and lookup layer (TypeScript/JavaScript only) — install, the single import specifier `paypal`, the server environments and the base-URL knob, the auth pattern, the SDK map that ships inside the installed package (`sdk-map.md` + `map/operations/`) and how to traverse it, and the file table naming the one source file owning each fact the map leaves to the source. Load this before answering any Paypal TypeScript SDK contract question or writing any SDK code."
---

# Getting started with the Paypal TypeScript SDK

> **Who this skill is for.** This is the **lookup layer** for anyone writing Paypal TypeScript SDK code — it is yours to follow directly and fully. Ground every contract fact here (in the SDK map, and in the source files it names) rather than in recall, and carry those facts onto a contract sheet before you implement. Load `typescript-integrate-paypal` for the workflow that wraps this skill.

This is the **SDK-specific** entry point. For general patterns that apply to any APIMatic-generated TypeScript SDK (client construction, auth, calling endpoints, models, error handling, resilience, testing), see the companion API-agnostic skills: `typescript-client-initialization`, `typescript-authentication`, `typescript-calling-endpoints`, `typescript-models`, `typescript-error-handling`, `typescript-configuration-resilience` and `typescript-testing`.

**This page and those companion skills are complementary — load both.** This page is authoritative for the SDK's *identity and surface* (what to install, what to import, the resources, which file owns which fact); the companion skills are the *usage layer* on top — the best-practice way to call each piece and the gotchas a signature cannot show. Reading a file in the installed package does not remove the need to load the skill for that step, so at each step below, load the companion *and* confirm names against the installed package.

## SDK identity

Verified against `package.json` and `sdk-map.md` of the generated package at version `2.29.0`. **Re-verify after a version bump** — this page is a snapshot, not a live read.

| Fact | Value |
| --- | --- |
| API | Paypal |
| Package name (what you install, and what you import) | `paypal` — **not on npm**; built from source (see *Install*) |
| Import specifier | `paypal` — the package root is the **only** entry; deep imports do not resolve |
| Source repository | https://github.com/context-plugins/paypal-typescript-sdk (branch `main` — the ref this map documents) |
| Version | `2.29.0` (API spec version `2.29`) |
| Client class | `PaypalClient` (`src/client.ts`) — one class, no sync/async split |
| Options type | `ClientOptions` (`src/client-options.ts`) — types only, no resolver beside it |
| Client construction | `new PaypalClient(options: ClientOptions = {})` — the argument is optional, as is **every** field on it, so `new PaypalClient()` compiles. Fields: `serverOptions` · `retry` · `fetch` · `oauth2` · `oauth2Strategy`. `retry` is the `RetryOptions` policy; its defaults retry a GET, HEAD, PUT or OPTIONS call up to `3` times and bound each attempt by `retry.timeout` = `60_000` ms, and every one of them can be changed |
| Auth | **OAuth 2 client credentials** — set `ClientOptions.oauth2` |
| Environments | no selector — one environment, so none is emitted; 1 server group |
| Base-URL config | `serverOptions.baseUrl` (`src/servers.ts`), defaulting to `https://api-m.sandbox.paypal.com` |
| Log environment variable | `PAYPAL_CLIENT_LOG` |
| Node floor | `>=20.3` (`engines.node`) |
| Runtime dependency | `zod` (`^4.1.0`), imported as `zod/v4-mini` — the only one |
| Module format | dual ESM + CommonJS folder dialects (`dist/esm`, `dist/commonjs`) behind one export |
| Typing | the package ships its own `.d.ts` and is generated under strict TypeScript. Callers get full inference — **a type error against this SDK is a real contract violation, not noise** |
| Surface | 40 operations · 5 resources · 284 models · 87 open enums · 40 per-operation error subclasses |

The table above is **orientation, not a copy-paste recipe** — it gives you the names and facts (install, import specifier, the auth *pattern*, the base-URL knob), while the actual integration code comes from the companion skills. Load each one as you reach its step (see **Integration workflow** below) and confirm its types against the installed package.

## Install

Install the package straight from the repository the plugin records for it, as it is not published to npm:

```bash
npm install git+https://github.com/context-plugins/paypal-typescript-sdk#main
```

The installed package carries everything its `files` list packs — `src/`, `sdk-map.md` and the pages under `map/operations/` — so **every lookup on this page works as soon as the install finishes**. **Make sure the installed package is built**, as the source on GitHub is not pre-built.

Do not vendor its `src/` into your project, point `tsconfig` `paths` at a throwaway clone, or import from `dist/` directly. Installing the package properly is what makes the `exports` map, the shipped `.d.ts` chain and the dual-dialect resolution behave the way the SDK expects — **and it is what puts the SDK map inside `node_modules`, which is where every lookup below reads it from**. Requires Node `>=20.3` (`engines.node`).

## Imports — one entry, and only one

**Every** public name is re-exported from the package root — the client, `ClientOptions`, 371 model types with the schema value beside each, the error classes, and the runtime types (`ApiPromise`, `ApiResult`, `RequestOptions`, `RetryOptions`, `RequestRetryOptions`, `ErrorPayload`, `Declared`, `Schema`, `EnumSchema`, `Encoded`).

```ts
import { PaypalClient, ApiError, PaypalError } from "paypal";
import type { ClientOptions, AvsCode } from "paypal";
```

Things the specifier alone will not tell you:

- **Deep imports do not resolve.** The `exports` map exposes `.` and `./package.json` and nothing else, so `paypal/models/…` fails (`TS2307`) even though the file exists in the shipped `src/`. Every `Source` path on the SDK map is where to **read** a shape, never what to import.
- **⚠ The SDK exports a model type literally named `Error`** (`src/models/error.ts`, schema `errorSchema`). Import it unaliased and it **shadows the global `Error`** for the rest of the file. Alias it: `import type { Error as SdkError } from "paypal"`.
- **From CommonJS**, the typed spelling is `import sdk = require("paypal")`. A plain `require` destructure runs but yields `any`.
- **`instanceof` is reliable within one dialect.** A process that loads both (`import` in one file, `require` in another) gets two independent copies of every error class, and `instanceof` across that boundary is `false` — narrow on `err.kind` / `err.payload.kind` / `err.name` there.

Under `verbatimModuleSyntax`, names carrying no runtime value (`ClientOptions`, every model type) must be imported with `import type`. Under `exactOptionalPropertyTypes`, **omit or spread** an absent optional field rather than assigning `undefined` to it.

## Hosts

This API declares one environment, so the SDK has **no environment selector** — there is no `ServerEnvironment` type and no field to set (`src/servers.ts`). The host below is the only one the SDK knows, and the override in the last column is the only way to reach another.

| Group | Base URL | Override at |
| --- | --- | --- |
| `default` | `https://api-m.sandbox.paypal.com` | `serverOptions.baseUrl` |

Consequences to state on every contract sheet that touches configuration:

- ⚠ **This SDK declares exactly one environment**, so it emits no `ServerEnvironment` at all and reaching any other host is a `serverOptions` base-URL override — `serverOptions: { baseUrl: "…" }`. Nothing in the options then records **which** deployment this is, which is exactly the shape of configuration that gets a live secret pointed at a test host or the reverse. Make the intent explicit where the client is built, and verify it.
- An override merges with the built-in default **key by key**; a `baseUrl` override replaces the template verbatim, template variable values are percent-encoded into it; server variables are filled in once, as the client is built, and only the path parameters expand per request.
- Each operation is bound to one server group at generation time. A map block carries a **Server** bullet only when its group is not `default`.

## Auth pattern (1 scheme)

Authentication is **per operation**: every operation declares the requirement it enforces and the SDK sends exactly that. Each block on a map page carries an **Auth** bullet, `none` included. There is no client-global switch and no per-call override. 40 of the 40 operations require a credential and 0 are public.

| `ClientOptions` field | Scheme kind | What the SDK sends |
| --- | --- | --- |
| `oauth2` | OAuth 2 client credentials | `Authorization: Bearer <access token>` |

```ts
const client = new PaypalClient({
  oauth2: { clientId: process.env.CLIENT_ID!, clientSecret: process.env.CLIENT_SECRET! },
});
```

**Every credential field is optional at the type level and that is a trap worth flagging on every sheet.** Omit one and nothing fails at construction — the request simply goes out without that credential and the server decides. Most APIs then answer `401`; one that serves anonymous traffic answers `200` and hides the omission entirely. So a `401` on a call you believed was authenticated is usually an unset field rather than an SDK failure; verify the field is set rather than waiting for a `401` to tell you, and check the operation's **Auth** bullet against what the client was actually given.

Three more behaviours the type does not show:

- **A credential may be a function.** Every field typed `TokenProvider` is re-read on **every** request with no caching, so a key can rotate without rebuilding the client. An empty string counts as absent; a function counts as present without being invoked.
- **Composition is emitted, not configured.** Where the spec puts two schemes in one requirement the SDK sends **both**; where it lists alternatives it sends the **first configured** one, in the order the **Auth** bullet prints them.
- **A 401 invalidates the cached credential.** On a 401 (401 only, not 403) the SDK clears whatever that operation's scheme had cached, so the *next* call re-acquires; the current request still rejects.

**OAuth 2 fetches and caches its own token.** The token request goes through **the same client** — same `fetch`, same `retry` policy — sends a form-urlencoded body, and decodes the response against a schema rather than casting it. A token is cached until shortly before it expires; a response with no `expires_in` is treated as never expiring (RFC 6749 §5.1); concurrent callers share one in-flight fetch. **A refused token endpoint rejects with `AuthError`**, wrapping the underlying `ApiError` as `cause` — so a bad secret never looks like the business call failing, and `AuthError` is *not* an `ApiError`. The token request is itself a `POST` with its own timeout, retried only when `httpMethodsToRetry` names `POST`.

| Flow | Token endpoint | Client credentials travel |
| --- | --- | --- |
| `oauth2` | `default` + `/v1/oauth2/token` | as `Authorization: Basic` |

`oauth2Strategy` on `ClientOptions` substitutes the whole token request (`getToken(credentials, signal)`, plus `tryRefreshToken(…)` where the grant is refreshable); the caching, expiry buffer and single-flight behaviour still apply.

The **token endpoint follows the same base URL** as the operations on its group, so it always tracks the environment or the override — you never configure it separately. Its group is named in the table above, against `src/servers.ts`.

See `typescript-authentication` for the full picture.

## Resources

Resources are **memoized lazy getters** on the client (`client.<attr>`). Their classes are exported only for their merged namespaces — the per-operation request and error types — and for `instanceof`; their constructors take engine internals that are not exported, so reach a resource only through its getter.

| Attribute | Class | Ops | Operations |
| --- | --- | --- | --- |
| `client.orders` | `Orders` | 8 | `authorizeOrder` · `captureOrder` · `confirmOrder` · `createOrder` · `createOrderTracking` · `getOrder` · `patchOrder` · `updateOrderTracking` |
| `client.payments` | `Payments` | 7 | `captureAuthorizedPayment` · `getAuthorizedPayment` · `getCapturedPayment` · `getRefund` · `reauthorizePayment` · `refundCapturedPayment` · `voidPayment` |
| `client.vault` | `Vault` | 6 | `createPaymentToken` · `createSetupToken` · `deletePaymentToken` · `getPaymentToken` · `getSetupToken` · `listCustomerPaymentTokens` |
| `client.transactionSearch` | `TransactionSearch` | 2 | `searchBalances` · `searchTransactions` |
| `client.subscriptions` | `Subscriptions` | 17 | `activateBillingPlan` · `activateSubscription` · `cancelSubscription` · `captureSubscription` · `createBillingPlan` · `createSubscription` · `deactivateBillingPlan` · `getBillingPlan` · `getSubscription` · `listBillingPlans` · `listSubscriptionTransactions` · `listSubscriptions` · `patchBillingPlan` · `patchSubscription` · `reviseSubscription` · `suspendSubscription` · `updateBillingPlanPricingSchemes` |

Every operation has the same call shape — `op(request, options?)`, one **flat, channel-blind** request object first and `RequestOptions` (`{ signal, retry, logging }`) second — and returns `ApiPromise<T, E>`.

⚠ **The request type name is not uniformly `<Operation>Request`.** 5 operations take `<Operation>RequestParams` instead: `confirmOrder`, `activateSubscription`, `cancelSubscription`, `captureSubscription`, `createSubscription`. Take the name from the operation's **Signature** bullet on its map page; never construct it from the method name.

## SDK map — look up first, open the file second

The SDK ships a generated map, and `package.json`'s `files` list includes it, so **installing the package gives you the map** — no clone is needed. It sits at the package root, the directory holding `package.json` and the `src/` tree:

- **`sdk-map.md`** — the index: client construction with the full `ClientOptions` table, the *Not on this SDK* table, the one error family with `ApiResult` and `.asApiResult()`, wire serialization for every channel, servers and auth, runtime and packaging, and the link table into the operations pages.
- **`map/operations/<resource>.md`** — one page per resource, one `###` block per operation, with bullets in the fixed order **Server**, **Signature**, **Wire** (verb and route), **Auth**, **Request body**, **SDK-sent**, **Returns**, **Error**, **Error arms** — then a **Fields** table giving every request field its channel, wire name, type, required flag and default, and a **Type sources** table naming the declaring file and schema value of every type the operation mentions.

Locate the installed package before you rely on a lookup:

```bash
node -e "console.log(require.resolve('paypal/package.json'))"
```

Failing that it is at `node_modules/paypal/`. **If the resolve fails, or the directory it prints carries no `sdk-map.md`, the map is still in the SDK's own repository** — <https://github.com/context-plugins/paypal-typescript-sdk>, branch `main`. A registry id is a claim on a shared index rather than proof of identity, so it can resolve to an unrelated package or to a release predating the map; the repository is the copy that is this SDK by construction. Read it there, and if neither route yields a map, mark the fact `UNVERIFIED` and say what would settle it rather than answering from memory.

Every `Source` path on the map is relative to that package root, so `src/models/<file>.ts` opens as written from there — the package ships its `src/` tree, so the path resolves inside `node_modules/paypal/` exactly as the map writes it. An import specifier ending `.js` inside that source is the NodeNext spelling of the sibling `.ts` file.

**The map is the locator; the source files are the shapes.** Read the map first — signatures, routes, request fields with their channels and defaults, return types, error arms, and which file declares a type are all answered there without opening a single `.ts` file. Then open the one file the map names for what it deliberately does not carry: a model's members, whether each is required, optional or nullable, and an enum's members with their wire values — the `as const` object in the enum's own file (for an enum inside a model, the file the model imports it from). The map says so itself — *"Shapes live only in the source … Do not derive the path from the type name."*

**`sdk-map.md` carries the invariants every operation block assumes, so read it before any `map/operations/` page**; the pages are written to be read beside it. And **silence means the default**: the index states what holds for every operation — the call shape, the flat channel-blind request object, the `ApiPromise<T, E>` return, the default server group, no pagination and no streaming — and a block departs from one only by saying so. Take the default and move on rather than opening the source to confirm it.

**The map carries shapes; what an operation *means* lives elsewhere.** When *what* to pass depends on meaning — which values a field accepts beyond its type, a rule that couples two fields, what a defaulted header actually selects — the map will not settle it. Read that operation's entry in `api-reference.md` at the package root, keyed by the same signature, *before* writing the sheet row, and record what you found. A value you already "know" for a field the map types as a plain `string` is a lookup, not a recall — the memory ban applies to it.

## Contract facts — the map first, then the source file

**Six of these are map lookups — don't open a source file for them:** an operation's signature; its request fields with channel, wire name, required flag and default; its return type; its error subclass and the arms with the status each covers; the `ClientOptions` fields and their defaults; and the environments, base URLs and auth wiring.

The table below covers everything else, and the full body behind a map row. Paths are relative to `node_modules/paypal/`:

| Question | File |
| --- | --- |
| A model's members, required (`f: T`) vs optional (`f?: T`) vs required-nullable (`f: T \| null`) | `src/models/<file the Type sources table names>.ts` |
| The operation method body and the request it builds | `src/resources/<resource>.ts` |
| The per-operation request and error types (merged namespace) | the `export namespace <Resource>` block at the foot of the same file |
| Client construction, resource getters | `src/client.ts` |
| `ClientOptions` fields | `src/client-options.ts` |
| Environments, base URLs, override merging | `src/servers.ts` |
| Auth scheme wiring, token endpoint, credential placement | `src/auth-schemes.ts`, `src/core/auth/credentials.ts`, `src/core/auth/oauth2-strategies.ts` |
| The transport: the attempt loop, `fetch` resolution, 401 invalidation, 2xx-vs-error split | `src/core/raw-client.ts` |
| Error classes and `ErrorKind` | `src/core/errors.ts`, `src/core/api-error.ts` |
| `ApiPromise`, `ApiResult`, `.asApiResult()`, the `Symbol.species` behaviour | `src/core/api-promise.ts` |
| `RequestOptions` (it is `{ signal, retry, logging }` and nothing else) | `src/core/api-request.ts` |
| `RetryOptions` and its defaults, `RequestRetryOptions`, backoff, `Retry-After`, `RetryAttempt` | `src/core/retry.ts` |
| `LoggingOptions` and its defaults (`defaultLoggingOptions`), `RequestLoggingOptions`, `Logger`, `LogDetails` | `src/core/logging.ts` |
| Schema decode/encode, `SchemaError`, `Encoded<T>` | `src/core/validation/schema-error.ts` and its directory |
| Wire serialization per channel | `src/core/param-value.ts`, `src/core/url.ts`, `src/core/headers.ts`, `src/core/params.ts` |
| What an operation *means* — field semantics, coupling rules | `api-reference.md` at the package root |

**Read scoped.** Search for the one symbol and read the lines around it rather than whole files, and never copy a design comment's rationale onto a contract sheet — the sheet carries facts an implementer must obey, not the reasoning behind them.

Keep lookups cheap — the rules that keep a session's context small:

- Collect the contracts for **every** in-scope operation in **one** pass — signature, request fields with channels and defaults, required members, the error arms, enum values — into a short **contract sheet** in your plan, then implement from the sheet. Don't re-open a map page per field, and never re-look-up a fact the sheet already carries.
- Recurse into a model's members only where the task actually sets them — a full transitive expansion is hundreds of rows nobody needs.
- **Never grep, glob or `find` the package to *locate* a type** — the map is the locator, and it says so. Grep only *inside* the file its **Type sources** table names, for the symbol. A sweep for a cross-cutting *shape* is a different question and is fine: "every field typed `unknown`", "every required-nullable member" are things nothing indexes, and one targeted `grep -rn` over `src/models/` is the right tool — record what it found on the sheet.
- Trust the compiler over this page: if a name here ever fails to type-check, re-read the file the table above names and report the drift; never patch around it from memory.

## Sensitive data — check the request models before you log anything

Whether this API's **request** models carry fields you must never log — card or bank numbers, personal data, message content — is a shape question: each request model's declaring file (the map's **Type sources** table names it) lists every field. If the scope touches such a field, four generator facts decide your logging posture (all in `typescript-configuration-resilience`): a JSON request body is logged **verbatim** when `logRequestBody` is on, with no redaction; a form body is masked only by deny-list; a per-call `RequestOptions.logging` level turns the request body on for that call, whatever the client set; and leaving `ClientOptions.logging` without a `logger` or a `level` arms the `PAYPAL_CLIENT_LOG` environment variable, which turns logging and both header switches on with no code change and no deploy — though never the body. So on any build that can carry such a field: `logRequestBody` stays off, no call on those paths passes a per-call level, `ClientOptions.logging.level` is set explicitly in production, and your own diagnostics never echo a request body on those paths.

The SDK never logs a response body, but your own code may. Responses are often safer — many APIs return masked variants of what requests carry raw — but that too is a model-shape fact: check the response model's file before assuming.

## Integration workflow — load the companion skill at each step

Before you write the code for each step, load the named companion skill — even if you have already read the relevant file. Each step calls out the trap the signature hides (in *parens*). A typical integration reaches them in this order:

1. **Client construction & lifetime** — load **typescript-client-initialization** before you write `new PaypalClient(…)`. (*The signature won't tell you:* every option is optional, so a client built with no arguments compiles and talks to the default environment with no credential; the client must be **long-lived and app-scoped**, never rebuilt per request, because the resource getters and the OAuth 2 token cache live on it; there is no `close()` or `dispose()` — it owns no pool, only a `fetch`; and when no `fetch` is reachable the **constructor** throws `ConfigurationError`, not the first call.)
2. **Authentication** — load **typescript-authentication** before you set credentials. The scheme is `oauth2` on `ClientOptions`. (*The signature won't tell you:* the field is optional — omit it and every request goes out unauthenticated with no failure at construction; the token is fetched lazily and cached on the client; a **failed token fetch** raises `AuthError`, which is not an `ApiError` and **bypasses `.asApiResult()` entirely**; and a 401 invalidates the cache without retrying the current call. Load secrets from the environment or a secret store, never hardcode.)
3. **Calling an endpoint** — load **typescript-calling-endpoints** before the first `client.<resource>.<operation>(…)` call. (*The signature won't tell you:* the request object is **flat and channel-blind** — a field named `body` *is* the whole request body and every other field is fanned out to path, query or header by the SDK, so nothing is nested by channel; **an omitted field that has a default is still sent, with that default**; **11 operations resolve to `undefined`**; and `.asApiResult()` must be called on the value the operation returned, because `ApiPromise` overrides `Symbol.species` and `.then()`/`.catch()` hand back a plain `Promise` with the method gone.)
4. **Models** — load **typescript-models** the moment a request/response member is not a plain string or number. (*The signature won't tell you:* models are plain `type`s built from object literals — no constructor, no builder; `f?: T` means omit the key, while `f: T | null` is **required and nullable** and `null` is a distinct value; enums are **open** (`const` companion plus a union admitting `(string & {})`), so the schema validates the base type only and an unknown server value round-trips instead of throwing — use `.values` to test membership yourself; and every type has a schema companion usable in both directions.)
5. **Error handling** — load **typescript-error-handling** before you write any `try/catch`. (*The signature won't tell you:* every operational failure is **one family**, `PaypalError`, narrowed on `err.kind` — `"api"` is an API error status, carried by `ApiError` and its per-operation subclasses — while four throwables sit outside it (`ConfigurationError` from the constructor, `SchemaError` from a codec called directly, a `TypeError` for a bug, and a caller abort's own `reason`), so a `catch` that tests the family has to rethrow the rest; **arm tags are schema-derived, not statuses** (see the sheet checklist below); a malformed 2xx body rejects with `DecodeError`, not `ApiError`, and `.asApiResult()` does not convert it; and a missing response field the schema permits is silently `undefined` rather than any error at all.)
6. **Configuration & resilience** — load **typescript-configuration-resilience** when you set the base URL, timeouts, retries, proxies, TLS, or logging. (*The signature won't tell you:* **retrying is on by default** — the default policy retries a GET, HEAD, PUT or OPTIONS call on `408`, `429`, `500`, `502`, `503` and `504` and on a dropped connection or timeout, and every one of those is a `RetryOptions` field you can change; a write is repeated only when `httpMethodsToRetry` names its method; `retry: { maxRetries: 0 }` turns it off, one call overrides it through `RequestOptions.retry`, and a `401` is not retried by default; `retry.timeout` bounds **one attempt**, up to its response headers, not the whole call, and `0` is a zero-length deadline while a value `setTimeout` cannot honour falls back to the default; **logging is off by default** — `ClientOptions.logging` turns it on with a `logger` or a `level`, and so does the `PAYPAL_CLIENT_LOG` environment variable when code sets neither, but a request body is logged only when code sets `logRequestBody`, and then a JSON body **verbatim**, with no redaction; **there are no hooks, middleware or interceptors** — `ClientOptions.fetch` is the one transport extension point, `onRetry` being the only built-in callback; and a `fetch` replacement is called with the attempt's `Request` and no `init`, so one that does not forward that `Request`, or its `signal`, makes both each attempt's timeout and every `RequestOptions.signal` inert.)
7. **Testing** — load **typescript-testing** before you stub the SDK. (*The signature won't tell you:* the seam is **`ClientOptions.fetch`**, not the client class and not the resource classes — whose constructors take unexported engine internals, so they cannot be instantiated in a test; stub bodies in **wire shape** and let the SDK decode them; assert on the request the SDK actually built, headers included; and cover the failure kinds an `ApiError`-only test misses, `DecodeError` above all.)

## What a contract sheet must carry for this SDK

Beyond the usual signatures and model members, a contract sheet for the Paypal TypeScript SDK is incomplete without these, because each one is a decision the implementer cannot make correctly from the signature alone.

1. **Which host each deployment talks to**, and where that is set. This SDK declares one environment and emits no `ServerEnvironment`, so any other host is a `serverOptions` base-URL override rather than an environment member — give the override path on the sheet.
2. **11 operations resolve to `undefined`** — `await` gives you nothing to inspect, so **`.asApiResult()` is the only way to observe their status and headers** — decide the mode at write time, not by retrofit.
3. **The exact request type name per operation**, taken from the **Signature** bullet — 5 operations take `<Operation>RequestParams`, not `<Operation>Request`.
4. **Every request field with its channel, wire name and default**, because the request object is flat and channel-blind and the SDK fans fields out. An omitted field that has a default is still sent with that default, so a defaulted header shapes the response whether or not the sheet mentions it. The generator injects an `Idempotency-Key` on every non-GET operation that does not declare that header itself — minted once per call and invisible to you. Every retry of that call re-sends the **same** key, which is what makes naming a write in `httpMethodsToRetry` safe where the provider deduplicates on it; but the next call mints a new one, so a call your own code repeats is two submissions. Any caller-supplied idempotency or request-id field is the only idempotency that spans calls, and `RequestOptions` is `{ signal, retry, logging }` only.
5. **Required vs optional vs required-nullable** for every model member the task sets — `f: T` required, `f?: T` omit the key, `f: T | null` required and nullable. And that under `exactOptionalPropertyTypes` an absent optional is **omitted or spread**, never assigned `undefined`.
6. **The error arms for each operation in scope, with the status each covers — and the warning that arm tags are schema-derived, not status codes.** Every operation rejects with its own `ApiError` subclass narrowed on `err.payload.kind`, and a tag comes from the arm's **body schema**: an arm whose body is a direct model reference is named after that model in lower camel (`"validationError"`), and every other body — a primitive, an array, a map, or no content — is named `"error{Status}"` (`"error400"`, `"error4XX"`, `"errorDefault"`), with a numeric suffix on the second of two arms that would otherwise land on the same name. The same tag means different statuses on different operations, and the same status carries different tags — so a tag is only meaningful beside the arm table it came from, and a shared helper that switches on `kind` across operations is a bug. 40 of 40 operations declare typed error bodies; the rest reject with the base `ApiError`. Every operation also carries an always-present `"undeclared"` arm holding `rawBody: ArrayBuffer`, for which **matcher precedence** matters: an exact numeric status is looked up across the whole table first, then the first covering range, and last a `"default"` arm where the spec declared one — whose body, if it does not fit, falls to `"undeclared"` rather than throwing.
7. **That a malformed or drifted 2xx body rejects with `DecodeError`, not `ApiError`, in both response modes** — `.asApiResult()` converts an HTTP error status, never any other failure. Any sheet row for a call whose result is used must name the members the implementer has to assert on, because a thin or truncated body decodes without complaint and the hole surfaces later.
8. **The retry policy this integration needs.** Retrying is on by default — `ClientOptions.retry` sets it for the client and `RequestOptions.retry` overrides it per call — so the sheet says whether the defaults fit, which writes (if any) join `httpMethodsToRetry`, since a write is repeated only when the policy names its method, and the per-attempt timeout.
9. **The logging this integration needs.** Logging is off by default — `ClientOptions.logging` sets it for the client and `RequestOptions.logging` sets one call's level — so the sheet says whether it stays off and, where it is on, the level, the logger, and whether headers and the request body are logged: a JSON request body is logged verbatim, with no redaction.
10. **That the SDK performs no pagination and no streaming at all**, and that `ClientOptions.fetch` is the one seam where either can be added — so whatever the task needs there is yours to build or deliberately omit. Say which.
11. **That `Error` imported from this package is a model type, not the global of that name** — every sheet that references one should carry the alias it will be imported under. The error base is re-exported as `PaypalError` for the same reason.
12. A **REQUIRED READING** block naming the `typescript-*` companions that govern the steps, with inline `MUST load` pointers.




<!-- Source: .agents/skills/typescript-client-initialization/SKILL.md; MIT; original SHA-256 70602ed10f61a49fe4c518db6ffe799c4d5b2722bed5668f2362116a3021c189 -->

---
name: typescript-client-initialization
description: Creating and reusing an APIMatic-generated TypeScript SDK client — construction, the ClientOptions shape, fetch ownership and client lifetime, and wiring the client into an application's startup. Load before wiring the client into an app or writing the factory that builds it.
---

# Initializing an APIMatic TypeScript SDK client

This applies to **any** APIMatic-generated TypeScript SDK. Replace placeholders with the real names
from the SDK you are using:

- `{Api}Client` — the single public client class (e.g. `FooClient`), declared in `src/client.ts`.
- `{package-name}` — the npm package name from `package.json`. This can differ from the client class
  name, and it is the **only** import specifier: deep imports (`{package-name}/models/…`) do not
  resolve, because the `exports` map exposes `.` and `./package.json` and nothing else.
- `{Environment}` — a member of the generated `ServerEnvironment` object (e.g. `Production`);
  `{environment}` is that same environment's lower-camel key inside `serverOptions`.
- `{group}` — a named server group key inside `serverOptions` (`default` is the usual one).
- `{resource}` / `{operation}` — a resource getter on the client and an operation on it.
- `{scheme}` — a credential member on the options object, one per auth scheme the API declares.

Everything under `src/core/` is vendored static code that is **byte-identical in every generated
TypeScript SDK**, so the engine behaviours below hold without checking yours. What varies per SDK is
`src/client.ts`, `src/client-options.ts`, `src/servers.ts`, `src/auth-schemes.ts`, `src/resources/`
and `src/models/`.

## Where to read the client's shape

1. **`sdk-map.md` § Getting a client** (at the package root) — the generated contract sheet. It prints
   the construction sample, the complete `ClientOptions` table (`Field` · `Type` · `Default`, plus the
   source file each field comes from), the per-request surface, and a **Not on this SDK** table naming
   what is absent by design. § **Servers & auth** carries the environments, the server groups and
   which operations require which scheme; § **Runtime & packaging** carries the dialects, the required
   globals and the browser floors. Start here.
2. **`README.md`** — Quick Start prints the same construction sample, in both the ESM and the
   CommonJS spelling.
3. `src/client.ts`, `src/client-options.ts` and `src/servers.ts` — the source, when you need to
   confirm something the docs do not carry.

Two facts about where those files live:

- **The package ships its own `src/`, plus the generated map.** `package.json` `files` includes
  `dist`, `src`, `README.md`, `api-reference.md`, `sdk-map.md` and `map`, so the readable TypeScript
  source and the lookup index are both inside `node_modules/{package-name}/`. Read them there rather
  than the compiled `dist/`.
- **`dist/` must exist before the package can be referenced.** The SDK builds with `tshy`; a freshly
  generated SDK consumed by path needs its `build` script run once. A `Cannot find module` on a
  path-installed SDK is usually this, not a bad import.

## Shape of the client

APIMatic TypeScript SDKs expose **one public client class** with **one constructor**, taking a single
options object:

```ts
constructor(options: ClientOptions = {})
```

Nothing on it is required and neither is the argument, so `new {Api}Client()` compiles. The options
object is the whole configuration surface, and reading the environment into it is yours to do at the
call site.

Operations are exposed on the client. Most are grouped under **resource getters** (one per API
resource group) and called `client.{resource}.{operation}(...)` — for example, a `widgets` resource's
`listWidgets` operation is `client.widgets.listWidgets(...)`. But when the spec declares **no tags**,
or exactly **one tag covering every operation**, no resource classes are emitted at all and every
operation sits **directly on the client**, called `client.{operation}(...)`. The available resource
getters (and any direct operations) come from the contract sheet (grounded in `src/client.ts` and
`src/resources/`) — not from the API's own documentation, and not from the compiled `dist/`. See
**typescript-calling-endpoints**.

The options type always carries these five knobs (credential members vary per API — see
**typescript-authentication**):

```ts
export type ClientOptions = {
  readonly serverEnvironment?: ServerEnvironment;  // selects the base URL
  readonly serverOptions?: ServerOptions;          // per-server, per-environment baseUrl override
  readonly retry?: RetryOptions | undefined;       // retry policy + per-attempt timeout (MILLISECONDS).
                                                   //   Retries ON by default
  readonly logging?: LoggingOptions | undefined;   // request/response logging — OFF by default
  readonly fetch?: FetchLike | undefined;          // the ONE transport extension point —
                                                   //   see typescript-configuration-resilience
  // + one OPTIONAL credential member per auth scheme the API declares, and — for an OAuth2 scheme —
  //   a {scheme}Strategy member alongside it (see typescript-authentication)
};
```

Those five names are minted by the generator and cannot move; a credential spelled like one of them is
the member that takes a suffix instead. **Every member is `readonly`**, and the client captures your
options once, at construction — a different configuration means a new client. Each default is
applied where the value is read: a server variable takes the `@default` on its member in
`src/client-options.ts`, `fetch` takes its in `src/core/client-options.ts`, every `retry` field
takes its in `src/core/retry.ts`, and every `logging` field its in `src/core/logging.ts`. Read them
there rather than trusting the numbers on this page.
Note in particular that the default `serverEnvironment` is the **first** environment the spec
declares, which is not necessarily the production one.

**Retries are on by default.** With `retry` left out, a `GET`, `HEAD`, `PUT` or `OPTIONS` call that
gets a `408`, `429`, `500`, `502`, `503` or `504`, or loses its connection, or times out, is re-sent
up to **3** more times with exponential backoff and jitter, honouring `Retry-After`. A `POST`,
`PATCH` or `DELETE` is sent once unless you name its method in `httpMethodsToRetry`. Every one of
those numbers is a `RetryOptions` field you can change, and `retry: { maxRetries: 0 }` turns retrying
off. So **a failed idempotent call surfaces only after its retries are spent** — seconds later than the
first failure, not at it. **typescript-configuration-resilience** owns the policy: the field table,
what is and is not retried, and per-call overrides.

**`fetch` is not a niche escape hatch — it is the only transport seam there is.** The SDK carries
**no hooks, middleware or interceptors**, **no pagination** and **no streaming**. Each of those is
something you build by wrapping `fetch` — including a header you want on every request.
**typescript-configuration-resilience** carries the wrappers. **Logging is built in and off by
default**: `logging` turns it on, and so does the `{APICLIENTTYPENAME}_LOG` environment variable (the
client class name in upper snake case, plus `_LOG`) when code sets neither a `logger` nor a `level` — so a
deployment can start writing request lines with no code change. `retry.onRetry` is the one built-in
callback, and it sees only retries. A replacement `fetch` is called with one `Request` and no `init`,
and **must forward that `Request`, or its `signal`,** to whatever performs the request; drop the signal
and both cancellation and every attempt's timeout go inert.

`retry.timeout` has its own trap: it is in **milliseconds**, it bounds **one attempt** — up to
its response headers — not the whole call, and a value the platform cannot honour is **not** "no timeout" — it is
resolved once when the client is built, and a negative, fractional, `NaN`, `Infinity` or out-of-range
value silently falls back to the default (`60_000`) rather than failing. A usable value reaches the
timer verbatim, so `timeout: 0` aborts every attempt instead of lifting the deadline. A single call
may override `maxRetries`, `timeout` and `statusCodesToRetry`, and its log level, through
`RequestOptions` = `{ signal, retry, logging }`; nothing else is per call.

## Direct instantiation

```ts
import { {Api}Client, ServerEnvironment } from "{package-name}";

const client = new {Api}Client({
  serverEnvironment: ServerEnvironment.{Environment},   // pick the environment your API exposes
  retry: { timeout: 10_000 },                            // per attempt; the retry defaults stand
  // ...set the credential member your API uses (see typescript-authentication)
});
```

Spell `serverEnvironment` out even when it is the default, so the host a call reaches is visible
where the client is built rather than inherited silently.

### What construction checks, and what it does not

A clean construction does not mean a working client. **What throws from the constructor** is
`ConfigurationError` — no reachable `fetch` implementation, a basic-auth username containing `:`, or a
`serverEnvironment` the SDK does not know — and `SchemaError`, for a `serverOptions` override whose
value its schema refuses: every server group is resolved as the client is built. Everything else is
accepted and fails later, one layer from its cause:

| Passed at construction | When it actually fails |
| --- | --- |
| a `retry` field out of range — a negative or fractional `timeout`, a `maxJitter` above `1`, a lower-cased `"get"` in `httpMethodsToRetry` | never — that field silently falls back to its default. `timeout: 0` is the exception: it is kept, and aborts every attempt. There is no `ValueError` equivalent here |
| a `baseUrl` override | first call — as a connection error, or as a `401` against the wrong host |
| wrong credentials | first call — and under OAuth2, first *token* request, so the error names the token endpoint rather than the operation you wrote |
| a misspelled or extra credential field | never at run time. Credentials are plain objects checked only by TypeScript; nothing re-validates them at construction |
| **an omitted** credential | first call, as a `401`. An unset credential configures the client for **no auth** — the operation sends no credential rather than erroring. See **typescript-authentication** |

That last row is the one integrations lose time to, which is why the factory below checks credentials
before constructing.

### Client and fetch lifetime

The SDK does **not** own a connection pool — `fetch` does. On Node the global `fetch` shares one
process-wide dispatcher, so the reason to keep one client is not the socket pool; it is everything the
constructor resolved and cached.

**Keep the SDK client long-lived — it is not a stateless wrapper.** The only thing you hand it is
configuration; its constructor resolves the rest and then owns it:

- the **transport** — a `RawClient` built over the resolved `fetch` implementation. If no `fetch` is
  reachable, **the constructor throws `ConfigurationError`**, not the first call;
- the **server groups** — `buildServers(options)` runs here and resolves every group **once**: the
  environment and each override are read and decoded as the client is built, and every call afterwards
  only attaches its own sub-path. So assigning `serverEnvironment` or mutating an override on the
  object you passed in does nothing, and a bad value throws from the constructor rather than from a
  call. Configure the server before you construct, and construct a new client to change environment.
  See **typescript-configuration-resilience**, *What is captured when*;
- the **auth schemes** — validated at construction (a basic-auth username containing `:` throws
  `ConfigurationError` from the constructor), and for an OAuth2 SDK the auth scheme *is* the access-token
  cache, closed over by the scheme object.

That last one is the reason a per-request client is a real cost rather than a stylistic one: a fresh
client starts with an empty token cache, so **every construction pays a token request on its first
call**. Three calls through three throwaway clients is three token round-trips where a shared client
makes one — and the shared one also collapses concurrent callers onto a single in-flight token
acquisition, which the throwaway ones cannot.

Resource getters are memoized per client (`client.{resource}` builds once, behind `??=`, and is
cached), so they are part of the same bargain. Never construct a resource class yourself: they are
exported only for their merged namespaces and for `instanceof`, and their constructors take engine
internals that are not exported.

Construct per request only where you genuinely need different credentials per request — and then
expect the token fetch. For rotating a secret without rebuilding, a credential member accepts a
**function** instead of a string; see **typescript-authentication**.

**There is nothing to close.** `src/core/` declares no `close()`, no `dispose()`, and no
`Symbol.dispose` / `Symbol.asyncDispose`, so the client holds no releasable resource and needs no
shutdown hook — the connection pool belongs to the runtime's `fetch`, not to you. The flip side is
that there is no drain either: to stop in-flight requests at shutdown you abort them yourself through
each call's `signal`.

**The `fetch` implementation is resolved once, in the constructor** (`config.fetch ?? globalThis.fetch`,
then stored). Two consequences that fail silently:

- **Monkey-patching `globalThis.fetch` after a client exists has no effect on that client.** A test
  that swaps the global and reuses a module-level client is still calling the original. Pass the fake
  through `ClientOptions.fetch` and build the client after — see **typescript-testing**.
- **A replacement must satisfy `typeof fetch`** — it is called as `fetch(request)`, one `Request` and
  no `init`, with `this` set to `undefined`, so a transport method that depends on its receiver must be
  bound before you pass it. It must forward that `Request`, or its `signal`, and resolve to a
  `Response` the decoder can read `status`, `headers` and a body from.
  **typescript-configuration-resilience** owns the wrappers.

## Choosing the server / base URL

**The shape does not vary with the spec.** However many servers or environments the API declares — one
of each, or several of both — you always get a `ServerEnvironment` object and a `serverOptions` bag
keyed by server group; a single-server, single-environment API simply gets a one-member enum and a
one-group bag. There is no arm where the constructor takes a bare `baseUrl` instead.

Environments are modeled as a `ServerEnvironment` const object plus a matching type alias, with one
member per environment the API defines (e.g. `ServerEnvironment.Production`, or region members).
Unlike model enums it is **closed** — no `| (string & {})` tail — so only declared members type-check.
Select one on `serverEnvironment`.

Overriding the base URL is nested **per server group AND per environment** —
`serverOptions.{group}.{environment}.baseUrl`, NOT directly on `serverOptions`. Any **templated
server variables** sit at that same level, beside `baseUrl`, one key per variable the URL template
names:

```ts
const client = new {Api}Client({
  serverEnvironment: ServerEnvironment.{Environment},
  serverOptions: {
    {group}: { {environment}: { baseUrl: "http://localhost:3000" } },
  },
});
```

An override is merged key-wise over that environment's defaults, so setting `baseUrl` alone leaves the
template variables in place, and naming one group leaves the other groups alone. **That last part is a
trap when an OAuth token endpoint lives on its own group**: redirecting the `default` group at a mock
does not move the token request, which still reaches the real host. Override every group the run
touches.

The group keys, the environment members, and the URL each resolves to are all in
`DEFAULT_SERVER_OPTIONS` in `src/servers.ts`, and tabulated under **Servers & auth** in the contract
sheet — **read them there**, because a member's name does not reliably tell you its host.
**typescript-configuration-resilience** owns server and base-URL configuration in full.

## Wiring into an application

The client is a plain object you construct and share, so the wiring is whatever your framework
already uses for singletons.

The simplest form, and the right one for scripts and small services:

```ts
// api-client.ts — one module-level instance, imported wherever it is needed
import { {Api}Client, ServerEnvironment } from "{package-name}";

export const client = new {Api}Client({
  serverEnvironment: ServerEnvironment.{Environment},
  {scheme}: process.env.API_TOKEN!,
});
```

⚠ **A module-level client is constructed at import time, and that has a consequence worth planning
for.** It reads `process.env` when the module is first imported — which, with ESM hoisting, can be
*before* your config loader, `dotenv`, or secret fetch has run. The credential then resolves to
`undefined`, and because **an unset credential is not an SDK error** (the operation simply sends no
credential), you do not get a startup failure. You get a `401` from the API on the first call, at
runtime, in whichever code path happens to run first — which reads like an expired token rather than
a load-order bug. Two ways out: load config before anything imports this module, or build the client
in a factory called from your startup path (below).

### Building it in a factory

The full shape. **The credential check is not optional to think about** — without it, a missing
environment variable is invisible until an unrelated `401`:

```ts
import { {Api}Client, ServerEnvironment } from "{package-name}";

export function build{Api}Client(): {Api}Client {
  const token = process.env.API_TOKEN;

  // SET THIS. An unset credential is NOT an SDK error — it sends no credential and 401s later.
  if (!token) throw new Error("API_TOKEN is not set");

  return new {Api}Client({
    serverEnvironment: ServerEnvironment.{Environment},

    // SET THIS. Default 60_000 ms. Bounds ONE attempt, and an idempotent call gets up to
    // 4 of them. See typescript-configuration-resilience > Retries.
    retry: { timeout: 10_000 },

    {scheme}: token,
  });
}
```

Both flagged lines are load-bearing and they answer different failures: the credential check turns a
silent `401` into a startup failure, and `retry.timeout` stops a hung provider from holding the caller
open for the full default minute on every attempt — up to four of them on an idempotent call. Setting
only the timeout is the common mistake — it looks like the configuration box is ticked.

Then register the result once, however your framework shares singletons, and inject it:

```ts
// The registration call differs per framework; the rule — build once, share — does not.
const client = build{Api}Client();

export class MyService {
  constructor(private readonly client: {Api}Client) {}

  doWork() {
    return this.client.{resource}.{operation}({ /* ... */ });
  }
}
```

Taking the client as a constructor parameter rather than importing the module singleton directly is
what makes the service testable — a test passes a client built over a fake `fetch`. See
**typescript-testing**.

### Where the client lives

| Host | Where to build it | Why |
| --- | --- | --- |
| Long-running server (Express, Nest, Fastify, …) | once at startup, shared for the process lifetime | one token cache, one set of memoized resource getters |
| Serverless function | **module scope**, not inside the handler | module scope survives warm invocations, so the token cache does too. It does not survive a cold start, and nothing can make it |
| `cluster` workers | once per worker, after the fork | workers are separate processes: **N workers is N token caches and N first-call token fetches**, and no client can be shared between them |
| `worker_threads` | once per thread | a client is not structured-cloneable — it holds functions and private fields — so it cannot be posted across the boundary |
| CLI / script | one at the top, or one per run | the process is short-lived; the cache never pays back |
| Browser / edge runtime | wherever your bundle initialises | the package ships `dist/esm` and `dist/commonjs` only — no bundle, no UMD, no CDN artifact — so it goes through a bundler. Deno, Bun, Workers and Vercel Edge need only the globals the map lists, but none is a tested target |

There is no fork-safety hazard to design around the way a pooled-socket SDK has: the client owns no
pool. The cost of building one per worker is the token cache, not a corrupt connection.

## ESM and CommonJS

The package ships both dialects from a single entry, so `require` works with full types. In a
TypeScript CommonJS file use the `import … = require(…)` form — a destructuring `require` runs fine
but gives you `any`:

```ts
import sdk = require("{package-name}");

const client = new sdk.{Api}Client({ serverEnvironment: sdk.ServerEnvironment.{Environment} });
```

⚠ **A process that loads both dialects gets two independent copies of every class**, including every
error class, and `instanceof` across that boundary is `false`. It is a real hazard in a mixed
codebase, and it fails silently — a `catch` arm simply never matches. Pick one dialect per process
where you can; where you cannot, narrow on `err.kind` or `err.payload.kind` instead of `instanceof`.
See **typescript-error-handling**.

Two consumer compiler settings change what you type at the construction site. Under
`exactOptionalPropertyTypes`, **omit or spread** an absent option rather than assigning `undefined` to
it. Under `verbatimModuleSyntax`, names that carry no runtime value — `ClientOptions` and every model
type — must be imported with `import type`; `{Api}Client` and `ServerEnvironment` are real values and
are imported normally.

## Inbound webhooks — what the emitted package does and does not give you

**There is no webhook surface at all** — no webhook tree, no event parser, no signature verifier, on
any generated TypeScript SDK. Nothing under `src/core/` computes any part of an inbound webhook for
you, and no member of `ClientOptions` turns one on.

So verifying an inbound webhook is entirely yours to write, against the provider's published scheme:
capture the raw body before any JSON parsing, compute the signature yourself, and compare in constant
time. The SDK's model types stay useful for *deserializing* an event body once you have verified it —
but do not read "the SDK parses this" as "the SDK verified this". See **typescript-models**.

Testing is a different matter and needs no shipped helpers — inject a fake `fetch`; see
**typescript-testing**.

> **Not settled by the generator's current version.** The transport carries default header, query and
> path-parameter channels that the generated client currently wires as empty arrays — a source comment
> says nothing in the spec reaches them *yet*. If a later version starts populating them, a
> client-wide header option could appear on `ClientOptions`, so read `src/client-options.ts` rather
> than assuming the option list above is complete for your SDK.

## Next

- Configure authentication → **typescript-authentication**
- Make your first call → **typescript-calling-endpoints**
- Tune timeouts, retries, logging, base URL → **typescript-configuration-resilience**



<!-- Source: .agents/skills/typescript-authentication/SKILL.md; MIT; original SHA-256 cc4653044e6c7e36cd293b14f91a18c8c167fe0fbff0ae6f23c72322fab5b05e -->

---
name: typescript-authentication
description: Authentication for an APIMatic-generated TypeScript SDK — supplying credentials on the client options object, the credential shape each scheme kind takes, OAuth 2 token caching and refresh, and replacing the token source. Load before wiring credentials into the client, or when a call comes back 401/403.
---

# Authenticating an APIMatic TypeScript SDK client

How you authenticate depends on the security scheme(s) the API declares. APIMatic surfaces each scheme
as an **optional credential member on `ClientOptions`**; set the one(s) your API uses, then construct
the client (see `typescript-client-initialization`). There is no separate credentials builder, no
per-request auth override, and no way to change a credential after construction.

```ts
const client = new {Api}Client({ {scheme}: /* credentials for that scheme */ });
```

> Throughout this skill, `{...}` is a placeholder for a name you take from your SDK (e.g.
> `{Api}Client`, `{package-name}`, `{scheme}`) — replace it with the concrete identifier from the
> source.

To see which schemes a specific SDK accepts, read the **credential members on its `ClientOptions`
type** in `src/client-options.ts` — those are the source of truth. `src/core/auth/` ships *every*
scheme factory as shared runtime code regardless of what the API accepts, so rely on the options type
rather than that folder. Where a member's name does not tell you its kind, `src/auth-schemes.ts` shows
which core factory each member is wired to.

The credential types below live under `src/core/auth/` and are exported from the package root; they
are the **same across all APIMatic TypeScript SDKs**. Only the **option member names** are generated
per-API (hence the `{scheme}` placeholders). The generator distinguishes **eight** scheme kinds — that
list is closed, so if the spec declared something outside it, read `src/auth-schemes.ts` to see what
was actually emitted rather than assuming a ninth shape. The eight collapse to **three** credential
shapes:

| Scheme kind | `ClientOptions.{scheme}` type | Sent as |
| --- | --- | --- |
| HTTP bearer | `TokenProvider` | `Authorization: Bearer {token}` |
| API key in header | `TokenProvider` | the spec's header name |
| API key in query | `TokenProvider` | the spec's query parameter |
| API key in cookie | `TokenProvider` | a `Cookie` pair under the spec's name |
| HTTP basic | `BasicAuthCredentials` | `Authorization: Basic base64(user:pass)` |
| OAuth 2 client credentials | `OAuth2ClientCredentials` | `Authorization: Bearer {fetched token}` |
| OAuth 2 password | `OAuth2PasswordCredentials` | `Authorization: Bearer {fetched token}` |
| OAuth 2 authorization code | `OAuth2AuthorizationCodeCredentials` | `Authorization: Bearer {fetched token}` |

## Basic auth

```ts
const client = new {Api}Client({
  {scheme}: {
    username: process.env.API_USERNAME!,
    password: process.env.API_PASSWORD!,
  },
});
```

Sends `Authorization: Basic base64(username:password)`.

A username containing `:` throws `ConfigurationError` **from the constructor** (RFC 7617 §2), so a bad value
fails fast rather than on the first call. The password is not validated — an empty one is sent as an
empty one.

## Bearer token

Set the configured token member to your access-token string:

```ts
const client = new {Api}Client({ {scheme}: process.env.ACCESS_TOKEN! });
```

Sends `Authorization: Bearer ACCESS_TOKEN`.

## API key (header, query, or cookie)

The key is sent as a header, query parameter, or cookie — its placement and name are fixed by the
generated scheme, not by anything you pass. Set the configured key member to your key string:

```ts
const client = new {Api}Client({ {scheme}: process.env.API_KEY! });
```

All four of these kinds are the **same slot to you**: `TokenProvider`, which is a string, or something
that produces one. Which channel it travels on is the scheme's business.

A query-placed key is percent-encoded exactly as an endpoint's own query parameter. A cookie-placed key
is **also** percent-encoded, and it is merged into any `Cookie` header already on the request rather
than replacing it — only a cookie of the same name is overwritten.

### A `TokenProvider` may be a function

```ts
type TokenProvider = string | ((signal: AbortSignal) => string | Promise<string>);
```

Pass a **function** when the secret rotates, comes from a vault, or is not known at construction time.
It is called on **every request** that needs the scheme, and it may be async:

```ts
const client = new {Api}Client({
  {scheme}: async () => await vault.read("api-key"),   // re-read per request
});
```

There is no caching around your callback — if the lookup is expensive, cache inside the callback. An
empty string counts as **absent** and the scheme sends nothing, so guard against a blank env var.

> **The next five sections apply only when the SDK declares an OAuth 2 scheme.** The three grants, the
> token lifecycle, and the token-fetch failure mode describe machinery that exists only if
> `src/client-options.ts` carries an `OAuth2…Credentials` member. Where it carries none, skip ahead to
> *Combined / multiple schemes*; nothing below can occur in that SDK.

## OAuth 2.0 — client credentials (machine-to-machine)

```ts
const client = new {Api}Client({
  {scheme}: {
    clientId: process.env.CLIENT_ID!,
    clientSecret: process.env.CLIENT_SECRET!,   // required for this grant
    scope: "read write",                        // optional — omit if the API needs none
  },
});
```

The SDK fetches and caches the token itself, acquiring a fresh one when it expires; on a `401` it
invalidates the cached token and re-acquires on the next call.

`scope` is a **single space-delimited string**, not a list — you join it yourself, per RFC 6749 §3.3.
An empty string is treated as absent and no `scope` field is sent. The generator emits **no scope
enum or literal union** even where the spec declares a scope vocabulary, so a scope the flow does not
document type-checks fine and fails at the provider instead.

## OAuth 2.0 — authorization code (3-legged, with PKCE)

This is the one grant that needs a human in the loop, so its credentials carry a **callback** the SDK
sends you to the authorization URL through. You return the authorization code:

```ts
import { PkceMethod } from "{package-name}";

const client = new {Api}Client({
  {scheme}: {
    clientId: process.env.CLIENT_ID!,
    clientSecret: process.env.CLIENT_SECRET,   // optional — see the note below
    redirectUri: "https://app.example.com/callback",
    scope: "read write",                       // optional
    state: crypto.randomUUID(),                // optional CSRF token
    pkce: PkceMethod.S256,                     // default; RFC 7636
    promptForAuthorizationCode: async (authorizationUrl, signal) => {
      // Send the user to authorizationUrl, then return the `code` your redirect endpoint received.
      return await waitForRedirectCode(authorizationUrl, signal);
    },
  },
});
```

The URL handed to your callback carries `response_type=code`, `client_id`, `redirect_uri`, `scope`
(when set), `state` (when set), and — unless PKCE is disabled — `code_challenge` plus
`code_challenge_method`. The matching `code_verifier` is sent on the token exchange automatically; you
never see or manage it.

- **`promptForAuthorizationCode` is called lazily**, on the first request needing the scheme — the
  same point at which the other grants fetch their token. In a server app that is almost never what
  you want mid-request; see *Supplying your own token source* below.
- **PKCE is on by default.** Omitting `pkce` means `PkceMethod.S256`; `pkce: null` disables it. The
  verifier and challenge are generated with `crypto.getRandomValues` / `crypto.subtle`, so the runtime
  needs Web Crypto (Node 20+ and browsers have it).
- The `signal` handed to your callback is the call's own signal, or one that never aborts when the
  call was given none — honour it, or a cancelled call leaves you waiting on a redirect forever.
- **Rejecting the callback is how you decline.** A user who closes the window, or a callback that
  throws for any other reason, surfaces as `AuthError` with your error on `.cause`, and no token
  request is sent. It is deliberately *not* a `ConnectionError`: a connection failure invites a
  retry, a declined consent needs the user asked again. Two rejections pass through untouched
  instead of being wrapped — one of the SDK's own error classes, and, when the call has been
  cancelled underneath you, the signal's own `reason`.

⚠ **No timeout covers the prompt, and it is not retried.** Only the call's `signal` ends it early,
and only if the prompt honours it.

⚠ **The prompt must not make an SDK call that uses this same scheme.** Concurrent acquisitions share
one in-flight promise, so a call made from inside the prompt waits on the acquisition that is waiting
on the prompt — a deadlock that breaks only when a signal aborts. The same applies to a custom token source's
`getToken`.

⚠ **`state` is passed through verbatim and the SDK does not validate it on the way back.** It is sent
on the authorization request and never generated or checked here — the SDK never sees the redirect, so
producing and verifying it are yours alone. Your redirect handler must compare it against what you
generated before returning the code, or the CSRF token is decorative.

⚠ **`clientSecret` is optional in the type, and only one of the two ways it can be missing throws.**

| PKCE | `clientSecret` missing ⇒ |
| --- | --- |
| disabled (`pkce: null`) | `AuthError("A client secret is required when PKCE is disabled…")` — **before** the prompt runs |
| enabled, token request is header-placed | no error: the SDK sends `Authorization: Basic base64(clientId:)` and the provider rejects it — **after** the user has completed the full browser round-trip |
| enabled, token request is body-placed | fine — this is the public-client case |

The placement is fixed by the spec, not by you, and is visible as the `placement` argument in
`src/auth-schemes.ts` (`"header"` sends `Authorization: Basic base64(clientId:clientSecret)` on the
token request; `"body"` sends `client_id` / `client_secret` as form fields). Check which one your
generated `src/auth-schemes.ts` passes before treating the secret as optional — the header case's
failure is the expensive one, because it costs an interactive login before the exchange fails.

## OAuth 2.0 — resource owner password

```ts
const client = new {Api}Client({
  {scheme}: {
    clientId: process.env.CLIENT_ID!,
    clientSecret: process.env.CLIENT_SECRET,   // optional (public clients)
    username: process.env.API_USERNAME!,
    password: process.env.API_PASSWORD!,
    scope: "read",                             // optional
  },
});
```

## Token caching & refresh (all OAuth 2 grants)

- Tokens are cached **in memory, per client instance**, and reused until **30 s** before expiry.
- Acquisition is **lazy** — on the first request that requires the scheme, not at construction. A
  client built with bad credentials constructs perfectly happily; the failure surfaces at the first
  operation. One in-flight acquisition is **shared**: concurrent requests that arrive during a fetch
  wait on that fetch rather than each starting their own.
- The fetch is a form-encoded `POST` to the token endpoint, sent with **no auth scheme of its own**,
  and it runs on its own `retry.timeout` and the call's abort signal — so token-fetch time does not
  come out of the operation's attempt.
- **A failure while obtaining the token is not retried by the call.** It ends the call.
- **The token request is itself a `POST` under the same policy.** With the default
  `httpMethodsToRetry`, an error status from the token endpoint — a `503` included — is not retried:
  it is an `AuthError` and ends the call. Name `POST` in the gate and the token request retries a
  retryable status like any other `POST`; the `AuthError` ends the call once those retries are spent.
- **The cache lives in the client object.** Build the client once (see
  `typescript-client-initialization`) or every call re-runs the grant.
- **Only the authorization-code grant refreshes.** It is the one grant wired to
  `oauth2RefreshableScheme` / `OAuth2RefreshableTokenStrategy`. Client-credentials and
  resource-owner-password re-run the whole grant when the token expires — and a `refresh_token` in a
  password-grant response is **discarded**, because the non-refreshable `OAuthToken` has no field for
  it. Do not infer refresh behaviour from what the provider returns.
- When the authorization-code grant does refresh, a refresh response that omits `refresh_token`
  carries the previous one forward. A refresh that fails does not throw — it returns `null` internally
  and falls back to a full re-grant.
- On `401`, the cached token is invalidated and re-acquired on the **next** call — `401` is not in the
  default `statusCodesToRetry`, so the failing request is **not** re-sent. Handle the 401 as an ordinary `ApiError` (see `typescript-error-handling`);
  the recovery is automatic on the following attempt, not on this one.

⚠ **A `401` on the authorization-code grant is an interactive re-authorization, not a silent
refresh.** Invalidation clears the whole cached token, refresh token included, so "re-acquired" means
the *full* grant runs again and `promptForAuthorizationCode` fires. Expiry takes the refresh path; a
`401` does not. Plan for that in a non-interactive host.

⚠ **The 30-second buffer is flat, with no floor.** A token whose `expires_in` is **30 or less** is
already past its adjusted deadline the moment it is cached, so every request re-runs the grant and the
cache never serves anyone. There is no half-of-lifetime fallback for short tokens. If your provider
issues sub-minute tokens, supply your own token strategy rather than paying a token round-trip per
call.

⚠ **If the token response omits `expires_in`, the token never expires as far as the SDK is
concerned** — and a non-positive `expires_in` is treated the same way. `expires_in` is RECOMMENDED but
not required by RFC 6749, and the SDK's expiry check short-circuits to "not expired" when it is
absent, so the first token is cached for the life of the client and the only thing that ever replaces
it is a `401`. That is usually fine and occasionally not: a token revoked server-side keeps being sent
until a request fails with it. If your provider omits `expires_in` and you need proactive rotation,
supply your own token strategy (below) rather than trying to bound the cache.

- **Invalidation is a hint, not a barrier.** It clears the cache without cancelling an acquisition
  already in flight, so that fetch can complete and re-populate it. That is deliberate — the newer
  token post-dates the invalidation — but it means "invalidate then immediately read" is not a
  guarantee of a fresh token.

### Supplying your own token source

The token strategy is a public extension point: alongside each OAuth 2 credentials member the options
type exposes a **`{scheme}Strategy`** member, typed `OAuth2TokenStrategy<{CredentialsType}>` (or
`OAuth2RefreshableTokenStrategy<…>` for the authorization-code grant), and the generated client falls
back to the built-in strategy only when you leave it unset.

```ts
const client = new {Api}Client({
  {scheme}: { /* the same credentials object */ },
  {scheme}Strategy: {
    async getToken(credentials, signal) {
      const stored = await tokenStore.load();
      if (stored) return stored;                       // { accessToken, tokenType, expiresIn?, … }
      const fresh = await mintTokenSomehow(credentials, signal);
      await tokenStore.save(fresh);
      return fresh;
    },
    // Authorization-code grant only — return null to fall back to a full re-grant:
    async tryRefreshToken(credentials, refreshToken, signal) {
      const refreshed = await refreshSomehow(credentials, refreshToken, signal);
      if (refreshed) await tokenStore.save(refreshed);
      return refreshed ?? null;
    },
  },
});
```

Reach for it when the token must come from somewhere other than the SDK's own call to the token
endpoint — a cache shared across processes, a secrets broker, a sidecar that already holds a valid
token, or a test double. The per-client in-memory cache above still wraps whatever you return.

The token shape is `OAuthToken` (`accessToken`, `tokenType`, `expiresIn?`, `scope?`) plus
`refreshToken?` on `OAuthTokenRefreshable`. Note the field names are **camelCase** — the SDK maps them
to the wire's `access_token` / `expires_in` / `refresh_token` for you, so a strategy of your own
returns camelCase and a token you persisted as raw JSON needs converting on the way back in. Read the
`{scheme}Strategy` member's declared type in `src/client-options.ts` rather than inferring which of
the two interfaces it takes.

⚠ **Never re-enter the interactive prompt from a request handler.** Acquire the authorization-code
token out of band, store it, and let `getToken` read the store — otherwise a cache miss under load
turns into a redirect attempt inside a request.

## The failure mode that surprises everyone

**A failed token fetch surfaces out of your *operation* call, and `.asApiResult()` does not protect
you from it.**

Auth is resolved inside the same dispatch the operation runs through, so both consequences follow from
one fact — the token fetch happens *during* your operation:

1. **The traceback points at the operation you called**, not at anything named "auth". A token
   endpoint that answers `400 invalid_client` becomes an `AuthError` thrown from
   `client.{resource}.{operation}(...)`, with the underlying `ApiError` on `.cause` — and its own
   `method` and `uri` name that operation, not the token endpoint. Reading only the top frame sends you
   looking in the wrong place entirely.
2. **The non-throwing form still rejects.** `.asApiResult()` converts the *operation's* error response
   into an `{ ok: false }` result instead of throwing — but auth is resolved before any response
   exists, so an `AuthError` propagates straight out of the `await`. Code written specifically to
   avoid exceptions still needs a `try`/`catch` around an authenticated call.

So a boundary that only inspects `result.ok` is incomplete:

```ts
import { AuthError } from "{package-name}";

try {
  const result = await client.{resource}.{operation}(request).asApiResult();
  if (!result.ok) { /* the operation's own error union */ }
} catch (err) {
  if (err instanceof AuthError) {
    // Credentials/token problem — the operation request was never sent.
    throw new Error("API credentials rejected", { cause: err });
  }
  throw err;
}
```

Treat it as an **auth** failure, distinct from an operation rejection: nothing was attempted,
so retrying it or reporting it as a failed operation are both wrong. `typescript-error-handling` has
the full catch ladder.

## Combined / multiple schemes

An operation can require more than one scheme, or any one of a set. The composition is applied for you
by `allAuth(...)` / `anyAuth(...)`; you configure it by setting the relevant credential members.

- **AND (`allAuth`)** — every scheme resolves and their headers, query params and cookies are all
  sent. If one has no credential it contributes nothing, and the request goes out **partially
  authenticated** rather than failing.
- **OR (`anyAuth`)** — the **first** scheme in declaration order that has credentials is used and the
  rest are ignored. So which credential is sent depends on declaration order in `src/auth-schemes.ts`,
  not on which looks more specific. A `TokenProvider` **function** always counts as "has credentials",
  even if it returns an empty string — so a function provider always wins the OR.

**This layer never withholds a request over a missing credential, and never throws for one.** An
unconfigured member simply drops out and the request goes out with whatever *was* configured; with
nothing configured at all it goes out unauthenticated. The server decides.

Because composition is **per operation**, one client may authenticate different operations with
different schemes — so set every member the operations your integration actually calls need, not just
the ones the API's front page advertises. The per-operation requirement is the **Auth** bullet on the
operation's block in `map/operations/*.md` (and in `api-reference.md`), which spells the composition
out: `` `{scheme}` ``, `all of …`, or `any of … — the first one configured is sent`.

## No auth

An operation the spec marked public is wired to `noneAuth` and sends **no credential even when every
option member is filled**. Its **Auth** bullet reads `none — public; no credential is sent`. Nothing
you pass at construction adds a credential to such an operation — if it needs one, that is a spec
problem, not a configuration one.

## ⚠ Missing credentials must stop the app from starting

Every section above covers supplying a credential. This one covers its **absence** — the case a
configuration-driven app hits in the real world, and the one most integrations get wrong.

**Every credential member is optional and an unset one does not throw.** The operation that wanted it
simply sends no credential, and you get whatever the API answers — typically a `401`, surfacing as an
`ApiError`, not as an auth failure. The SDK will never tell you that you forgot to supply a
credential; only the provider will, one round-trip later and one layer away from the cause. A
"mysterious 401" is very often an unfilled option member — check that before suspecting the
credentials themselves.

An API that serves anonymous traffic at all — public endpoints, or a reduced rate limit for keyless
callers — makes this worse by answering `200` and hiding the omission entirely. So verify the member
is actually set rather than waiting for a `401` to tell you.

**A required credential that is not configured is a deployment fault, not a request fault.** If the
app boots with a blank secret, an operator sees a provider outage, retry logic hammers a call that can
never succeed, and the actual cause — an unset environment variable — is two layers away from the
symptom. There is no `.env` support and no `fromEnvironment()` helper in the SDK, so **validate at the
call site and refuse to boot**:

```ts
function buildClient(): {Api}Client {
  const key = process.env.API_KEY;
  if (!key) {
    throw new Error(
      "API_KEY is not configured. Set it via environment variable or your secret store " +
      "before starting the app.",
    );
  }

  return new {Api}Client({
    serverEnvironment: ServerEnvironment.Production,
    {scheme}: key,
  });
}
```

Run that check **before** the app is ready to serve — at module load or in your startup path, not
lazily on first use, which is a request, which is exactly the late failure you are trying to avoid.

Three rules for the message it fails with:

- **Name the missing config key**, so the operator knows what to set. `"API_KEY is not configured"` —
  not `"authentication failed"`.
- **Never echo the value**, present or absent — no length, no prefix, no masked form. A
  `"configured: sk_live_1234…"` line is a secret in a log.
- **Do not fall back to a default, a placeholder, or an unauthenticated client.** Booting degraded
  hides the fault and pushes it to the first caller.

Check every credential the scheme requires. Basic auth needs both halves — a username with an empty
password is misconfigured, not partially configured. An empty-string `TokenProvider` is treated as
absent, so a blank env var is the same fault as an unset one.

## Notes

- A given SDK only exposes the credential members for the schemes its API declares; those names are
  generated per-API (hence the `{scheme}` placeholders above). Fill every member the operations you
  call need.
- **Credentials are fixed at construction.** `ClientOptions` is `readonly` and the auth schemes are
  built in the constructor, so to rotate a credential you use a `TokenProvider` **function**, replace
  the strategy, or build a new client. There is no mutable accessor.
- **Rotating a long-lived client:** the token cache is per client instance, so swap atomically — build
  the new client, then replace the shared reference. In-flight calls finish on the old one and there
  is no window where calls have no credential. Do not mutate the old client.
- **Auth wins every header, query and cookie collision.** Auth params are merged **last**, after the
  client's defaults and the endpoint's own, so a scheme's `Authorization` header overwrites anything
  set earlier under that name. There is no per-request header override to undo it — a `fetch` wrapper
  is the only place you can strip or replace an auth header (see
  `typescript-configuration-resilience`).
- **Nothing hides secrets in a log you write.** Credentials are plain objects with no redacting
  `toString`, so `console.log(options)` or a serialized `ClientOptions` prints them in full. The SDK's
  own logging, off by default, masks the `Authorization` header, a query value off its safe list and
  the OAuth form keys (`client_secret`, `password`, `refresh_token`, …) — but a JSON request body it
  logs verbatim once `logRequestBody` is on (see **typescript-configuration-resilience**).
- On the OAuth 2 token request, header placement sends `base64(clientId:clientSecret)` **without
  percent-encoding either half** first. A client id or secret containing a character RFC 6749 §2.3.1
  would have you encode is sent raw, so a provider that follows the RFC strictly may reject it — use
  body placement or a custom strategy if your secret is not in the unreserved set.
- **`AuthError` means a credential could not be obtained** — the token request failed, every
  configured branch of an alternatives requirement failed, PKCE was disabled without a secret, or your
  `promptForAuthorizationCode` rejected. Being *refused* a credential by the API is an `ApiError` with
  status 401/403 instead, so one `catch` arm cannot absorb the other. A token endpoint that answers with
  an error status surfaces as `AuthError` with that `ApiError` on `.cause`; an alternatives requirement
  whose every branch failed carries an `AggregateError` there, holding each branch's failure.
- Credentials never appear in a thrown error's message.
- **A token endpoint may live on a different server group than the operations.** Overriding
  `serverOptions.default.{environment}.baseUrl` therefore does not move the token request — override
  that group too if you need both redirected at a mock. See `typescript-configuration-resilience`.
- Keep secrets out of source — read `process.env` or your secret manager at the call site. Set
  credentials **before** constructing the client; there is no way to add them afterwards.



<!-- Source: .agents/skills/typescript-configuration-resilience/SKILL.md; MIT; original SHA-256 4141d1099198f4428e838a1e1a20cfdb347641e212c30873be8897f6537e37c0 -->

---
name: typescript-configuration-resilience
description: Client configuration and resilience for an APIMatic-generated TypeScript SDK — the five ClientOptions fields, server/base-URL selection and template variables, the retry policy (on by default — what it retries, what it never does, per-call overrides) and the per-attempt timeout, cancellation, the built-in logging (off by default — levels, redaction, the environment variable), proxies, TLS and connection pooling, and what the SDK does not do for you (pagination, streaming) built on the one `fetch` seam. Load before you construct or tune the client — the field list alone does not reveal that idempotent calls are retried by default and writes are not, that the timeout bounds one attempt rather than the call, that an environment variable turns logging on with no code change, that the default environment is whichever the spec listed first, that `fetch` is handed one `Request` it must forward, that Node's fetch ignores HTTP_PROXY, or that a hand-written page loop is unbounded by default.
---

# Configuration & resilience for an APIMatic TypeScript SDK

> **One skill, every shape.** This file covers every configuration surface the TypeScript generator
> emits. Which parts YOUR SDK exercises — how many server groups and environments it declares, which
> template variables those carry, whether an operation takes a page or cursor field, whether the API
> offers an idempotency key — are facts of the API definition, not of this skill: take them from
> `sdk-map.md` and `map/operations/{resource}.md` at the package root, and **apply only the guidance
> that matches**.

> `{...}` is a placeholder for a name you take from your SDK — `{Api}Client` (the one public client
> class, declared in `src/client.ts`), `{resource}`/`{Resource}`, `{operation}`/`{Operation}`,
> `{group}`, `{environment}`, `{variable}`, `{items}`, `{nextCursor}`. Replace each with the concrete
> identifier from the source; none of them is a name the generator emits literally.
>
> `{APICLIENTTYPENAME}_LOG` is the logging environment variable: the client class name in upper snake
> case, plus `_LOG`, so `AcmeClient` reads `ACME_CLIENT_LOG`. The getting-started skill's identity table
> names yours.

Everything configurable is a field on `ClientOptions` (`src/client-options.ts`), passed to the one
constructor. There is no `Configuration` class, no builder, and no per-request override beyond
`{ signal, retry, logging }`. Server groups, environments and their URL templates live in `src/servers.ts`.
Everything under `src/core/` is vendored static code that is **byte-identical in every generated
TypeScript SDK**, so the engine behaviours below hold without checking your SDK.

## The whole configuration surface

| Field | Type | Default | Purpose |
| --- | --- | --- | --- |
| `serverEnvironment` | `ServerEnvironment` | first declared | selects which environment's server options are read |
| `serverOptions` | `ServerOptions` | `{}` | per-group, per-environment `baseUrl` and template-variable overrides |
| `retry` | `RetryOptions` | retries **on** — see *Retries* | the retry policy, and `retry.timeout` (**ms**, `60_000`) bounding each attempt |
| `logging` | `LoggingOptions` | **off** — see *Logging* | the built-in request/response logger, its levels and its redaction |
| `fetch` | `FetchLike` (`typeof fetch`) | global `fetch` | **the one transport extension point** |
| `{scheme}` / `{scheme}Strategy` | per scheme | unset | credentials — see **typescript-authentication** |

Read the defaults off your own SDK rather than trusting the column: the credential members and the
default environment are per-SDK.

## Not on this SDK

Absent **by design**, not undocumented. This list ships with `src/core/` and is versioned with it:

| You might reach for | Reality |
| --- | --- |
| hooks, middleware, interceptors, `onRequest`/`onResponse` | none. `fetch` is the one transport extension point; `retry.onRetry` is the one callback, and it sees only retries |
| pagination, `for await`, auto-paging helpers | no operation is paginated and nothing is async-iterable |
| SSE, `text/event-stream` | no event streams. Every decoder reads the body to completion, bar a binary success, which hands its stream over unread |
| multipart <em>responses</em>, XML bodies | none. Body kinds are empty, JSON, form-urlencoded, text, multipart and binary |
| per-request `headers`, `baseUrl`, idempotency key | none. `RequestOptions` is `{ signal, retry, logging }`; `retry` takes only `maxRetries`, `timeout` and `statusCodesToRetry`, and `logging` only `level` |
| a circuit breaker, a rate limiter | none. The retry loop honours `Retry-After`, but nothing limits how many calls you start |
| the raw `fetch` `Response` | deliberately unreachable. `status`/`headers` are on `asApiResult()` and on `ResponseError` |

Everything in the left column that you actually need, you build on `fetch`. The rest of this skill is
those patterns and the traps in them.

**What the SDK does own**, so that you do not rebuild it: URL and server resolution, request
encoding and schema validation on the way out, auth application and OAuth token caching, response
decoding, the two-family error mapping, the `Idempotency-Key` on every non-GET call, the retry
loop with its per-attempt timeout, and request/response logging with redaction. Connection pooling
belongs to `fetch`, not to the client.

## The `fetch` seam

```ts
type FetchLike = typeof fetch;
```

The SDK calls it with **one argument, the attempt's `Request`, and no `init`**. The method, the
headers (the credential included), the body and the signal are all on that `Request`. One rule, and it
is the one that breaks things when missed: **forward that `Request`, or at least its `signal`**, to
whatever performs the request. Drop the signal and both each attempt's `retry.timeout` and per-call
cancellation go inert — the call neither aborts nor times out, because the transport enforces both
through that signal. A wrapper written against `(input, init)` still type-checks, but `init` is always
`undefined`: whatever it reads from `init` is nothing, and whatever it passes as `init` **replaces**
what the `Request` carries, so `fetch(input, { headers })` drops every header the SDK set. On an abort
a replacement may reject with whatever it likes: the SDK reads the reason off the signal it built the
`Request` with, so a deadline is still a `TimeoutError` the retry loop retries, and a caller abort
still rejects with the caller's own `reason`.

Four facts that decide how you write a wrapper:

- **It sees every request the client makes, including the OAuth token request.** The auth schemes are
  built over the same transport as the operations (`buildAuthSchemes(options, servers, rawClient)` in
  the constructor), so a wrapper that logs requests logs the token POST — `client_secret` and all. The
  built-in logger (*Logging*) masks it; a hand-rolled one does not. Filter by URL where that matters.
- **It sits under the retry loop, so it sees every attempt.** A call retried three times is four
  requests through your wrapper, each a fresh `Request` with its own signal, and a wrapper that logs
  writes four lines. To see one line per logical call, log around the SDK call instead; to see why an
  attempt was abandoned, use `retry.onRetry` or the built-in logger's retry line.
- **A plain `Error` thrown from a wrapper reaches the caller as `ConnectionError` with your error on
  `.cause` — and is retried like a dropped connection** for a method in the retry gate, so a
  deliberate refusal is thrown again on every attempt and surfaces only after the backoff. A member of
  the `{Api}Error` family (`TimeoutError`, `ConnectionError`, …) passes through unwrapped, and is
  retried only if its `kind` is `connection` or `timeout`.
- **Wrappers compose by nesting, innermost-first at the network:** in
  `new {Api}Client({ fetch: tracingFetch(proxiedFetch) })` the tracer sees the request before the
  proxy dispatches it. Do not add a retrying wrapper to the stack — see *Retries*.

## `serverOptions` configuration for each environment

The base URL is resolved **per server group and per environment**. `src/servers.ts` declares one
options type per group, and each carries a nested object for **every environment** the API declares:

```ts
export type ServerOptions = {
  {group}?: {
    {environment}?: { baseUrl?: string; {variable}?: string };
  };
};
```

Each environment's entry exposes what the SDK substitutes into that group's URL: the **`baseUrl`
template** (always present and settable) plus any **template variables** the spec declares for that
server — a region, a subdomain, a port, an API version. Names and counts vary per API and per
environment; a group with no variables exposes `baseUrl` alone. Read the real group keys, environment
keys, URL templates and variable defaults from `DEFAULT_SERVER_OPTIONS` in `src/servers.ts`, or from
the **Base URLs and overrides** table in `sdk-map.md`.

```ts
const client = new {Api}Client({
  serverEnvironment: ServerEnvironment.{Environment},

  serverOptions: {
    // Fill one template variable, keeping the declared baseUrl template:
    {group}: { {environment}: { {variable}: "eu" } },

    // Or replace the template outright — a mock server, a proxy, a self-hosted gateway.
    // A literal URL with no {placeholders} is used as-is:
    // {group}: { {environment}: { baseUrl: "http://localhost:3000" } },
  },
});
```

Four things about how this resolves:

- **Overrides merge with the declared defaults per group-and-environment pair, key by key**
  (`{ ...DEFAULT_SERVER_OPTIONS.{group}.{environment}, ...yours }`). Setting `{variable}` alone keeps
  the declared `baseUrl`; setting `baseUrl` alone keeps the declared variables. Naming one group or
  one environment leaves every other untouched.
- **Only the selected environment's options are read.** Set `baseUrl` on the wrong environment and
  your value is silently ignored in favour of the selected one's default.
- **`baseUrl` is a template, not a URL.** Variables are percent-encoded into their `{placeholder}` at
  request time. A placeholder in a `baseUrl` you supply is only substituted if a declared variable of
  that exact name exists — otherwise it survives into the URL verbatim, and nothing rejects it the way
  an unfilled path parameter is rejected.
- **An environment value the SDK does not know throws `ConfigurationError` from the constructor** —
  every server group is resolved once, as the client is built, so no operation method throws
  synchronously.

### ⚠▶▶ Always pass `serverEnvironment` explicitly

`serverEnvironment` has a default, so `new {Api}Client()` compiles and reaches a real host. **That
default is whatever environment the spec listed first** — the first member `ServerEnvironment`
declares in `src/servers.ts`, and the one whose arm every resolver in that file labels `case
undefined:` alongside its own. For many providers the spec lists sandbox first. Nothing announces it.

A deployment that believes it configured production and did not gets sandbox behaviour with
production credentials, which fails auth in a way that reads like a credentials problem rather than an
environment one. **Pass it in every environment, production included**, so the host a call reaches is
visible where the client is built.

`ServerEnvironment` is a **closed** union — no `| (string & {})` tail — so a literal typos out at
compile time. A value arriving from configuration does not. Map it explicitly and **fail on an unknown
value** rather than falling through to the default:

```ts
const ENVIRONMENTS: Record<string, ServerEnvironment> = {
  sandbox: ServerEnvironment.{Sandbox},
  live: ServerEnvironment.{Production},
};

const serverEnvironment = ENVIRONMENTS[process.env.API_ENV ?? ""];
if (!serverEnvironment) throw new Error(`unknown API_ENV: ${process.env.API_ENV}`);
```

Without the guard, a typo in a deployment variable becomes `undefined`, and an `undefined`
environment is read as *none selected*: every resolver's default arm answers to `case undefined:`
alongside its own label, so the client runs quietly against the default environment instead of the
one you asked for. Nothing throws, and nothing is logged. An unknown *string* is the loud case — the
constructor rejects it with `ConfigurationError` (above) — so it is the value your own
configuration turns into `undefined` that fails silently, which is what the guard is for.

### What is captured when

`serverEnvironment` and `serverOptions` are both read **once**, as the client is built. The constructor
calls `buildServers(options)`, which resolves every server group — the environment, its `baseUrl` and
each variable, decoded through its schema — into a value that every call afterwards only attaches its
own sub-path to. So mutating the `serverOptions` object you passed in, replacing a whole group
(`serverOptions.{group} = …`), or assigning `serverEnvironment` afterwards has no effect on the client.
**Configure the server before you construct, and construct a new client to change environment.**

### Redirecting at a mock

⚠ **An OAuth token endpoint may live on its own server group.** Redirecting `{group}` at a mock does
**not** move the token request, which still reaches the real host and fails or, worse, succeeds against
production. Override every group the run touches. See **typescript-authentication**.

This is a real base-URL override, not a proxy — the SDK builds requests against the URL you give it.
For a proxy, see *Proxy or custom agent* below.

## Retries — on by default

**A client built without `retry` retries.** With the defaults:

- A `GET`, `HEAD`, `PUT` or `OPTIONS` call that gets a `408`, `429`, `500`, `502`, `503` or `504`, or
  whose attempt fails with a `ConnectionError` or a `TimeoutError`, is re-sent up to **3** more times,
  backing off roughly 1 s, 2 s and 4 s, and honouring `Retry-After`.
- A `POST`, `PATCH` or `DELETE` is sent **once**, whatever went wrong. The method gate covers every
  failure, faults included.
- **A `401` is not in the default status set.** The transport invalidates whatever that operation's
  auth scheme had cached, so the *next* call re-acquires; the failing call rejects. You see one `401`,
  then recovery.

The loop lives in `src/core/retry.ts`, and `src/core/raw-client.ts` runs every call through it.
Configure it with any subset of `RetryOptions` — a field you leave out keeps its default:

```ts
new {Api}Client({ retry: { maxRetries: 0 } });            // off: every call is sent exactly once
new {Api}Client({ retry: { timeout: 10_000 } });          // the defaults, with a tighter per-attempt budget
new {Api}Client({
  retry: {
    maxRetries: 5,
    httpMethodsToRetry: ["GET", "HEAD", "PUT", "OPTIONS", "POST"],   // see *Making a write safe*
  },
});
```

| Field | Default | Meaning |
| --- | --- | --- |
| `timeout` | `60_000` | Milliseconds **one attempt** may take, up to its response headers. Not a budget for the call |
| `statusCodesToRetry` | `[408, 429, 500, 502, 503, 504]` | Exactly these and no others — there is no family rule, so `[429, 503]` stops retrying `500`. `[]` retries no status, while faults still retry |
| `httpMethodsToRetry` | `["GET", "HEAD", "PUT", "OPTIONS"]` | The gate: a call outside it is never re-sent. `[]` turns retrying off. Upper case only |
| `maxRetries` | `3` | Retries *after* the first attempt, so `3` is up to four sends. `0` turns retrying off |
| `delay` | `1000` | Milliseconds before the first retry, and the base the curve grows from |
| `backoffFactor` | `2` | What each successive delay is multiplied by, between `1` and `100` |
| `useExponentialBackoff` | `true` | `false` repeats `delay` unchanged |
| `maxJitter` | `0.25` | A **fraction**, `0` to `1`, and additive: a wait lands between its delay and `delay × (1 + maxJitter)`. `0` makes every wait exact |
| `onRetry` | none | `(attempt: RetryAttempt) => void`, called before each retry's wait |

`0`, `false` and `[]` are values, never misses. Anything else a field cannot honour — a negative or
fractional `timeout`, a `maxJitter` of `50`, a list carrying a lower-cased `"get"` — **silently falls
back to that field's default**, and the client still constructs. `timeout: 0` is kept: it is a
zero-length deadline that fails every attempt, not "no timeout".

The wait before retry *n* (counting from 0) is
`min(Retry-After ?? delay × backoffFactor ** n, 60_000) × (1 + random × maxJitter)`, rounded up. The
60-second ceiling is the engine's, not an option, and jitter sits on top of it, so the longest single
wait is 75 s at the defaults.

What the loop does and does not do — read these before you rely on it:

- **The method gate covers every failure.** A status in the set, a dropped connection, a timeout: each
  is retried only for a method in `httpMethodsToRetry`. `PUT` is in the default gate — see *Making a
  write safe*.
- **`Retry-After` is honoured** in both its delta-seconds and HTTP-date forms, capped at 60 s, with
  jitter added on top — never subtracted, so the SDK never wakes before the time the server named. A
  malformed value falls back to the curve.
- **A caller abort is never retried.** Aborting your `signal` cuts a backoff wait short and rejects
  with the signal's own `reason`.
- **A streaming request body is never retried**, whatever the method, because a stream cannot be
  replayed.
- **A failure while obtaining a credential is not retried.** It ends the call — once the token
  request's own retries are spent, since it is a `POST` under this same policy and retries only when
  `httpMethodsToRetry` names `POST`.
- **A rejection from your `fetch` that is not an SDK error counts as a dropped connection.** It
  becomes a `ConnectionError` and is retried — including a refusal your own wrapper throws on purpose
  (see *The `fetch` seam*). The exception is one that arrives after the attempt's timeout or your
  signal fired: the SDK reads the reason off the signal it built, so a caller abort rejects as itself
  and is not retried, and a timeout becomes a `TimeoutError` and is retried like any other. What the
  replacement rejected with does not change either.
- **A retried-away response is released** — its body's cancel started, not awaited, before the wait,
  so a cancel that stalls never holds up the retry — and only its headers reach `onRetry`. When the last attempt fails, the call rejects with **that** attempt's failure: an
  `ApiError` (or the operation's subclass) for a status, a `ConnectionError` or `TimeoutError` for a
  fault — the same shapes as with retrying off (**typescript-error-handling**). `.asApiResult()` sees
  the last response.

**Do the arithmetic before you accept the defaults.** `retry.timeout` bounds each attempt, not the call,
so an idempotent call's worst case is `(maxRetries + 1) × timeout` plus the waits — four minutes at the
defaults. Nothing in the SDK imposes a wall-clock ceiling on the call; *Bounding a call* below is how
you impose one.

### Per-call overrides

Three fields can be overridden on one call through `RequestOptions.retry`, typed `RequestRetryOptions`.
Each is merged field by field over the client's policy, so a field you omit keeps the client's value:

```ts
await client.{resource}.{operation}(request, { retry: { maxRetries: 0 } });              // this call: one attempt
await client.{resource}.{operation}(request, { retry: { timeout: 5_000 } });             // this call: 5 s per attempt
await client.{resource}.{operation}(request, { retry: { statusCodesToRetry: [503] } });  // this call: a narrower set
```

The type admits only these three. How many attempts *this* call gets, how long each may take, and which
statuses are worth a second try vary by call site; the backoff curve, the method gate and `onRetry` are
how the client paces itself against one server, so they are set on the client alone. A per-call
`httpMethodsToRetry` would be a second route to retrying a write. The restriction is the type's
alone: an object carrying another `RetryOptions` field — from JavaScript, or through a constant typed
as the wider record — still has it honoured, so do not rely on the type to keep a write out of the
gate for one call.

### Observing retries

`onRetry` is the one built-in callback. It runs before each retry's wait — not for the first attempt,
and not on success — with the retry about to be made:

```ts
const client = new {Api}Client({
  retry: {
    onRetry: ({ attemptNumber, delay, reason }) => {
      if (reason.kind === "status") log.warn({ attemptNumber, delay, status: reason.status }, "retrying");
      else log.warn({ attemptNumber, delay, kind: reason.error.kind }, "retrying after a fault");
    },
  },
});
```

Narrow `RetryReason` on `kind` before reading the rest: a `"status"` carries the `status` and the
discarded response's `headers`, a `"fault"` carries the `connection` or `timeout` error and no response
at all. A fault from an OAuth token request carries the token endpoint's `uri`, not the operation's.
**Keep the callback to logging and metrics** — a throw from it ends the call with the error it threw.
With the built-in logger on at `warn` or below, the SDK writes its own retry line before `onRetry`
runs, so you need the callback only for metrics or a sink of your own.

### When the SDK's policy is not enough

Rules to hold to:

- **Retry idempotent reads freely; treat every write as a separate decision.** A write that timed out
  may have succeeded — a reset after the bytes reached the server is indistinguishable from one before.
  The default gate encodes exactly this.
- **Do not stack a second retry layer** — a retrying `fetch` wrapper, a `withRetry` around the call, a
  job that re-runs on failure — on top of the SDK's without turning the SDK's off for that path.
  Attempts multiply (four inside four is sixteen round-trips, and up to sixteen times the timeout), and
  every attempt of a caller-level layer is a new SDK call that mints a **new** `Idempotency-Key`.
- **Never retry an `EncodeError`, a `DecodeError`, an `AuthError` or a 4xx other than `408`/`429`.** On
  an `EncodeError` nothing was sent at all — the fix is in your code. A `DecodeError` means the
  response was malformed, which a resend rarely cures. An `AuthError` means a credential could not be
  *obtained*, which is configuration, not weather. The loop retries none of them, and neither should
  you. See **typescript-error-handling**.

When a decision genuinely needs something the policy cannot express — a retry that depends on the
decoded error payload, or on which operation it is — turn the SDK's loop off for that call and own
retrying entirely at the caller:

```ts
import { {Api}Error } from "{package-name}";

async function withRetry<T>(work: () => Promise<T>, attempts = 3): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await work();
    } catch (err) {
      if (attempt === attempts || !isTransient(err)) throw err;
      await new Promise((r) => setTimeout(r, 2 ** (attempt - 1) * 500 * (1 + Math.random())));
    }
  }
}

function isTransient(err: unknown): boolean {
  if (!(err instanceof {Api}Error)) return false;   // an abort's reason, a configuration fault, a bug: no
  return err.kind === "api" && isRetryableConflict(err);   // your decision, on the decoded payload
}

await withRetry(() => client.{resource}.{operation}(request, { retry: { maxRetries: 0 } }));
```

`{Api}Error` is the whole error family, narrowed on its closed `kind`. The runtime declares it as `CoreError`, and the
package exports it **only** under the SDK-branded alias — read the real name off the
`CoreError as …Error` line in `src/index.ts`. See **typescript-error-handling**.

### Making a write safe under retries

**Start from what you have.** With the default gate a `POST`, `PATCH` or `DELETE` is sent once. The
exposure arrives when you widen `httpMethodsToRetry` or add a retry layer of your own, and with two
things no setting fixes:

- **`PUT` is in the default gate — idempotent by HTTP's definition, not necessarily by your
  provider's.** A `PUT` can still carry a per-call side effect — an audit row, an outbound webhook, a
  metered charge — that a resend duplicates. Where yours does, drop `"PUT"` from
  `httpMethodsToRetry`.
- **"It was not resent" is not "the write did not happen."** A transport failure on a `POST` leaves the
  outcome *unknown*: the bytes may have reached the provider before the socket died. That is a
  reconciliation problem, and no retry setting solves it.

**Decide which requirement you are meeting before you pick a remedy — they are not interchangeable.**
*"A duplicate must be harmless"* is options 1–2, and the provider still receives more than one write.
*"At most one write may reach the provider"* is option 4, the only one that holds the count at one
regardless of how the client is later configured. The four, **weakest guarantee first** — so do not
read the numbering as a recommendation order:

1. **Make the write idempotent at the provider.** Makes a resend *harmless* rather than rarer; the send
   count stays above one.

   **The SDK sends an `Idempotency-Key` header on every operation other than a `GET`** — a UUID minted
   once per call, unless the operation declares a header of that name itself, in which case that one is
   a field you set. **Every attempt of the SDK's retry loop re-sends the same key**, because the loop
   re-sends the request the SDK already built. That is what makes naming a write in
   `httpMethodsToRetry` safe — **where the provider deduplicates on it**. A retry of your own is a new
   call and mints a new key: the provider sees two submissions.

   Where the operation declares its own key — a header, a query parameter, a form field or a body
   member, all alike in the flat, channel-blind request object; the `Channel` column of its **Fields**
   table tells them apart (**typescript-calling-endpoints**) — **generate it once per logical action and
   reuse it across every attempt you make**:

   ```ts
   const requestId = crypto.randomUUID();          // once per logical action, NOT per attempt
   await withRetry(() =>
     client.{resource}.{operation}({ ...body, {idempotencyKey}: requestId }, { retry: { maxRetries: 0 } }),
   );
   ```

   A key generated inside the retried function is a fresh key on every attempt, which deduplicates
   nothing while looking exactly like a solution.

   Two cautions, neither of them visible in the type:

   - **Whether the provider actually enforces it is not visible in the SDK.** The header being sent,
     or a declared key field existing, is not a guarantee that a resend is deduplicated. Verify
     against the provider's documentation or live traffic before widening the gate.
   - **Keys expire, and the retention window differs per API.** A resend after a long backoff may fall
     outside it and be treated as a new request. Only the provider's documentation carries that number.
2. **Reconcile after a failure** — on a transport failure on a write, re-read provider state to
   establish what actually happened instead of assuming nothing did. Detects a duplicate; does not
   prevent one. Same reflex as an unreadable write response — see **typescript-error-handling**.
3. **Send the write once, explicitly** — `{ retry: { maxRetries: 0 } }` on that call, or a separate
   client for writes built with `retry: { maxRetries: 0 }`:

   ```ts
   const reads  = new {Api}Client({ ...shared });
   const writes = new {Api}Client({ ...shared, retry: { maxRetries: 0 } });   // no resends
   ```

   Holds at one send today; stops holding the moment someone removes the override or widens the gate
   on `writes`, and that failure does not announce itself.
4. **A guard wrapper that refuses a re-send it did not authorise** — the only option that holds the
   count at one no matter how the client is configured, because a blocked attempt never reaches the
   network. Reach for it whenever a duplicate would be externally visible or costly to undo, and
   combine it with option 2 to settle the outcome of the one send you allowed.

   Three details decide whether it works:

   - **A `fetch` wrapper sees every attempt of the SDK's loop by construction**, because the loop sits
     above `fetch`. But its refusal reaches the loop as a `ConnectionError`, which **is retried** for a
     method in the gate — each retry is refused again, and the call rejects only after the backoff,
     with your error on `.cause`. Pair the guard with option 3 on the guarded write, so the refusal is
     immediate, and recognise it with `err.cause instanceof YourRefusal`.
   - **Keep the "already sent" marker in state that outlives one attempt** — an `AsyncLocalStorage`
     scope the caller opens around the write, or a closure created per unit of work. A marker hung off
     `init` is per-attempt bookkeeping only, and a caller-level retry (a job re-running after a
     timeout) creates a fresh one either way.
   - **Key it on method and URL.** The guard also sees the OAuth token request, and a token
     acquisition must not be counted as the write.

   Count the send **before** it goes out. A request that failed on the way out may still have been
   received, so "this may already have taken effect" is the only safe reading — surface it as an
   **unknown outcome** to be settled by re-reading provider state (option 2), not as a definite failure.

**Where the provider ignores the key, retrying a write is a real duplication risk.** Keep the write
out of the gate; the safe recovery is option 2 — re-read state and decide — not a resend. Some
operations are naturally idempotent anyway (cancelling an already-cancelled resource is usually
harmless), but that is a **per-operation judgement** made against the provider's documentation, not a
property you can assume for the whole class of writes.

**All four bound the call YOU make to the provider. None of them is a reason to change the contract
your own callers see.** Key the guard on something you already hold — a reference derived
deterministically from what the caller sent. A caller that sent a well-formed request and got a `4xx`
because your guard wanted an extra field is a defect you introduced, not a duplicate you prevented.
And **a guard needs a release**: a claim or marker with no expiry turns one transient failure into a
permanent refusal. Clear it once the outcome is settled, and expire it when it never is.

## Bounding a call — the two layers, and which one is a total

| Layer | Scope | Default | Bounds a whole call? |
| --- | --- | --- | --- |
| `retry.timeout` | one attempt, up to its response headers | `60_000` ms | **No** — an idempotent call gets up to `maxRetries + 1` attempts, plus the waits between them |
| the `signal` you pass to the call | everything from dispatch to resolution, retries and waits included | none | **Yes** — the only one |

### `retry.timeout`

In **milliseconds**, bounding **one attempt** — enforced with an `AbortController` inside the
transport, surfacing as a `TimeoutError` (`err.kind === "timeout"`) once no retry is left. Each attempt
gets its own deadline. What the field list does not tell you:

- **It stops at the response headers.** The timer starts once the credential is in hand, so obtaining
  a credential and reading the body are bounded only by your `signal`. A built-in OAuth token request
  runs on its own timer.
- **A value the platform cannot honour is not "no timeout".** Negative, fractional, `NaN`, `Infinity`
  and anything above `2_147_483_647` ms — the largest value a timer can hold — all fall back to the
  SDK's default (on a call, to the client's value), silently, and the client still constructs. A usable
  value is installed **verbatim**, `0` included, so `timeout: 0` is a zero-length deadline that fails
  every attempt rather than lifting it. An unbounded attempt is not expressible.
- **One call can take its own.** `{ retry: { timeout: 5_000 } }` on the call replaces the client's
  value for that call — still per attempt. For a budget on the whole call, use a signal.
- **A `fetch` replacement that does not forward the `Request`'s `signal` makes it inert.** Pass the
  `Request` on, or copy it with `new Request(request)`, which keeps the signal.

### Cancellation and real deadlines

`RequestOptions` is `{ signal?: AbortSignal; retry?: RequestRetryOptions; logging?: RequestLoggingOptions }`,
and `signal` is the whole per-call cancellation surface.

```ts
const controller = new AbortController();
const t = setTimeout(() => controller.abort(new Error("deadline exceeded")), 2_000);
try {
  await client.{resource}.{operation}({ /* ... */ }, { signal: controller.signal });
} finally {
  clearTimeout(t);
}
```

A caller abort rejects with whatever you passed to `abort()` — the signal's own `reason`, unwrapped and
outside the `{Api}Error` family — so pass something diagnostic, and rethrow it from a family `catch`.
An already-aborted signal rejects immediately, and an abort during a backoff wait ends the wait and the
call; an abort is never retried.

For a **deadline across a whole call or unit of work** — one call and its retries, or several calls —
`AbortSignal.timeout` and `AbortSignal.any` compose (both on Node 20+):

```ts
async function withDeadline<T>(work: (signal: AbortSignal) => Promise<T>, ms: number, caller?: AbortSignal) {
  const deadline = AbortSignal.timeout(ms);
  return await work(caller ? AbortSignal.any([deadline, caller]) : deadline);
}
```

That is how you give one operation a ceiling that `retry.timeout` cannot: the deadline covers every
attempt and every wait, and the earlier of the two wins.

⚠▶▶ **A per-attempt timeout does not bound a request.** If one handler makes more than one SDK call —
a loop over records, a fan-out, a create-then-confirm pair — the per-call timeouts **add up**, and they
add up *faster* when each failure is caught so the work can continue: every swallowed timeout costs its
full bound and the next call still runs — and an idempotent call spends up to `maxRetries + 1` of
them before it fails. **The check is arithmetic, not judgement:** `calls in this handler ×
(maxRetries + 1) × timeout`, plus the waits, must sit under the budget you are willing to make a caller
wait. Count the calls in
the loop, not the calls in the snippet — a handler that processes every record on file makes as many
calls as there are records.

**Give the total bound one home, not one per call site.** A controller written out at each call is the
layer that gets skipped, so any operation added later silently has no ceiling. Put it at the one
service that fronts the SDK and route every operation through it:

```ts
export class {Api}Gateway {
  constructor(private readonly client: {Api}Client, private readonly budgetMs = 20_000) {}

  private bounded<T>(work: (signal: AbortSignal) => Promise<T>, caller?: AbortSignal): Promise<T> {
    const deadline = AbortSignal.timeout(this.budgetMs);
    return work(caller ? AbortSignal.any([deadline, caller]) : deadline);
  }

  {operation}(request: {Resource}.{Operation}Request, caller?: AbortSignal) {
    return this.bounded((signal) => this.client.{resource}.{operation}(request, { signal }), caller);
  }
}
```

Link the caller's own signal in — a request whose client has disconnected should stop the outbound work
too.

> **Browser floor.** Cancellation needs `AbortController.abort(reason)` and `AbortSignal.reason`
> (Chrome 98, Firefox 97, Safari 15.4). The SDK's own module-load floor is lower, so between the two
> the engine still aborts the request but **produces no typed error at all**.

## Pagination — drive it yourself

Nothing is paginated and nothing is async-iterable. When an operation returns a page, advance its page
or cursor field in a loop and stop on the API's own end signal:

```ts
// Offset/page style:
const PER_PAGE = 100;
for (let page = 1; ; page++) {
  const result = await client.{resource}.{operation}({ page, perPage: PER_PAGE });
  for (const item of result.{items}) process(item);
  if (result.{items}.length < PER_PAGE) break;      // short page — usually the last
}

// Cursor style:
let cursor: string | undefined;
do {
  const result = await client.{resource}.{operation}({ ...(cursor ? { cursor } : {}) });
  for (const item of result.{items}) process(item);
  cursor = result.{nextCursor};
} while (cursor);
```

Read the actual page/cursor field names off the operation's **Fields** table and its response model —
they are spec-specific, and the SDK sends a defaulted `page`/`perPage` whether or not you set it. Prefer
the API's explicit end signal (a null next-cursor, a `hasMore` flag) over inferring from a short page
where one exists.

### ⚠⚠ Never leave a page loop unbounded

**Both loops above are wrong as written**, and the reason is the same one that makes hand-driven paging
riskier than the auto-paging this SDK does not have: *the only stop condition is the provider's
cooperation*. A provider that keeps returning a next cursor, a cursor that fails to advance, a filter
the provider quietly ignores, or a `perPage` it silently caps below what you asked for will each spin
forever. The failure does not look like a slow request. It looks like a request that **never returns**,
with tens of thousands of provider calls billed behind it and no error the provider can be blamed for.

**Every page loop needs at least one bound that does not depend on the provider.** Pick what matches
the use case; a page cap is the cheapest and is never wrong:

| Bound | Use when | Shape |
| --- | --- | --- |
| **page cap** | always — the backstop | `if (++pages >= MAX_PAGES) break;` |
| **item cap** | the caller wants "the first N" | `if (out.length >= max) break;` |
| **deadline** | the loop sits behind a request timeout | one `AbortSignal.timeout` passed to every call |
| **no-progress guard** | cursor or offset paging | stop if the cursor did not change between pages |

```ts
const MAX_PAGES = 100;
const signal = AbortSignal.timeout(30_000);          // bounds the whole walk, not one page
let cursor: string | undefined;
let seen: string | undefined;

for (let pages = 0; pages < MAX_PAGES; pages++) {
  const result = await client.{resource}.{operation}({ ...(cursor ? { cursor } : {}) }, { signal });
  for (const item of result.{items}) process(item);

  cursor = result.{nextCursor};
  if (!cursor) return;                               // the provider's end signal — the happy path
  if (cursor === seen) throw new Error("cursor did not advance");
  seen = cursor;
}
throw new Error(`stopped after ${MAX_PAGES} pages`);  // truncating silently is its own defect
```

Prefer to **narrow the query before you page it** — a provider-side date range, status filter, or a
`perPage` matching what the caller needs turns "walk everything" into a handful of pages. And **a bound
that silently truncates is a different defect from one that hangs**: when you hit the cap, surface it
or log it; never return a partial set that reads like a complete one.

Wrapping a bounded loop in an async generator gives you the `for await` the SDK does not:

```ts
async function* all{Items}(signal?: AbortSignal): AsyncGenerator<{Item}> {
  let cursor: string | undefined;
  for (let pages = 0; pages < MAX_PAGES; pages++) {
    const result = await client.{resource}.{operation}({ ...(cursor ? { cursor } : {}) }, { signal });
    yield* result.{items};
    cursor = result.{nextCursor};
    if (!cursor) return;
  }
  throw new Error(`stopped after ${MAX_PAGES} pages`);
}
```

A failed page rejects mid-enumeration like any other call — see **typescript-error-handling**.

## Event streams — not carried

There is no SSE support. When the spec declares a `text/event-stream` success response, the generator
**still emits the operation** but gives it the **empty-body decoder**, because the vendored runtime
has no carrier for it. A **binary** success is different and is carried: it resolves to a
`BinaryContent` whose `stream` you read once or release — see **typescript-calling-endpoints**.

The consequence of the empty decoder is specific and worth knowing before you debug it: it asserts
the body is empty, so such an operation **fails at the call** with `DecodeError` ("Expected an empty
response body") the moment the server sends anything — rather than quietly resolving something the
spec never described. The operation's **Returns** bullet reads `undefined` for these.

Outbound, only an XML request body has no carrier, so such an operation is emitted with no body field
at all. Multipart and binary bodies are both sent. See **typescript-calling-endpoints**.

**If you need one of these endpoints, call it with `fetch` directly** — build the URL from the same
base URL, and copy the credential header the SDK would have sent. The SDK cannot carry it, and no
option makes it.

## Logging

**The SDK has a built-in request/response logger, and it is off by default.** Turn it on through
`ClientOptions.logging`, a `LoggingOptions` exported from the package root with `Logger`, `LogLevel`,
`LogDetails` and the value `defaultLoggingOptions`:

```ts
import { {Api}Client, defaultLoggingOptions } from "{package-name}";

const client = new {Api}Client({
  logging: {
    logger: appLogger,          // any { error, warn, info, debug }; default `console`
    level: "info",              // "off" | "error" | "warn" | "info" | "debug"
    logRequestHeaders: false,   // default
    logResponseHeaders: false,  // default
    logRequestBody: false,      // default — read the warning below before enabling
    redactedKeys: [...defaultLoggingOptions.redactedKeys, "card_number"],
  },
});
```

How it turns on — the first row that applies wins:

| what is set | what is logged |
| --- | --- |
| `logging.logger` | everything the switches allow, at `debug` unless `level` says otherwise — your logger's own level does the filtering |
| `logging.level`, and no `logger` | lines at that level and above, to `console` |
| neither, and `{APICLIENTTYPENAME}_LOG` holds a level | see the warning below |
| nothing | nothing — `level` is `"off"` |

What it writes, and at which level. The SDK filters by level itself, then calls your logger's method of
the same name:

| Line | `event` | Level | Written when |
| --- | --- | --- | --- |
| `sending {METHOD} {url}` | `HttpRequest` | `info` | every attempt |
| `request headers` | `RequestHeaders` | `debug` | `logRequestHeaders` |
| `request body` | `RequestBody` | `debug` | `logRequestBody`, and the media type is in `loggableContentTypes` |
| `{METHOD} {url} succeeded with status {n} in {ms}ms` | `HttpResponse` | `info` | a `2xx` |
| `{METHOD} {url} failed with status {n} in {ms}ms` | `HttpResponse` | `warn` | any other status |
| `response headers` | `ResponseHeaders` | `debug` | `logResponseHeaders` |
| `{METHOD} {url} retrying in {ms}ms (retry {n} of {max}) after {reason}` | `HttpRetrying` | `warn` | before each retry, ahead of `onRetry` |
| `{METHOD} {url} failed after {ms}ms: {ErrorName}` | `HttpFailed` | `error` | a call that ends on a fault or on a credential it could not obtain |

Each line is `logger.{level}(message, details)`: the message is complete text, and `details` is a
`LogDetails`, a union you narrow on `event`. The SDK calls the method **on** your logger, so one that
reads its own state through `this` works as it is. `console` and winston take `(message, meta)` and
plug in directly; pino takes `(details, message)` and needs a four-line adapter:

```ts
import pino from "pino";
import type { Logger } from "{package-name}";

const p = pino();
const appLogger: Logger = {
  error: (message, details) => p.error(details, message),
  warn: (message, details) => p.warn(details, message),
  info: (message, details) => p.info(details, message),
  debug: (message, details) => p.debug(details, message),
};
```

**Keep the logger non-throwing.** An error thrown from it ends the call with that error — on a
response line, after the request already reached the server.

**The URL and the headers are redacted by allow-list, which is the safe direction.** A query value is
masked unless its key is on a short known-safe list (`cursor`, `dates`, `datetime`, `limit`,
`offset`, `page`, `since`, `size`, `strings`); a header is masked unless it is an ordinary transport
header — `authorization`, `cookie` and every api-key header are not on that list, so they are masked.
`redactedKeys` (default: `sig`, `signature`, `access_token`, `apikey`, `api_key`, `client_secret`,
`password`, `refresh_token`, `code`, `assertion`, `client_assertion`) adds keys to the masked set,
`redactedHeaders` forces a header in, and `unmaskHeaders` opts one out; the mask is
`redactionPlaceholder` (`"***"`). The URL **path** is not masked — an id or reference in the route is
logged as it is. `redactedKeys` and `loggableContentTypes` **replace** their default rather than add to
it, so spread `defaultLoggingOptions` to extend one, as above.

⚠▶▶ **`logRequestBody: true` does not redact a JSON body**, and only half-redacts a form body. A JSON
body is logged **verbatim** — truncated at `bodySizeLimit` bytes (32 KB), and only when its media type
is in `loggableContentTypes` (`application/json`, `application/x-www-form-urlencoded`). A form body gets
key masking, but by **deny-list**, not by the allow-list the URL uses: only keys in `redactedKeys` are
masked, so `card_number` in a form body prints in the clear although the same key in a query string
would not. Any other media type is not logged unless you add it to `loggableContentTypes`. On any
endpoint that carries card data, bank details, personal data or a credential in the body, switching
this on writes that data to your logs. Leave it off in production; turn it on for one endpoint at a time
behind a flag you can prove is off.

⚠▶▶ **An environment variable turns logging on without a code change.** When code sets neither a
`logger` nor a valid `level`, the client reads `{APICLIENTTYPENAME}_LOG` once, as it is built, through
`process.env` — a runtime without `process` reads nothing. It takes a level name (`error`, `warn`,
`info`, `debug`, or `off`) and writes to `console`. `debug` also turns **both header switches** on; the
request body it never turns on — only code can. A value that is not a level warns once on `console`,
and logging stays off. Setting `logger` or `level` in code disables the variable outright — which is the
reason to set `logging: { level: "off" }` explicitly where you must guarantee silence.

**Per-call override.** `RequestOptions.logging`, typed `RequestLoggingOptions`, takes one field, `level`,
for that call alone. Two things about it are easy to get wrong:

- It **replaces** the client's settings for that call rather than raising them. A per-call `level`
  decides every line by itself with **all three switches on**, so `{ logging: { level: "debug" } }`
  writes both header lines **and the request body**, whatever the client set. `{ logging: { level:
  "off" } }` silences that one call.
- It cannot lift your logger's own filter. With a `logger` supplied, a per-call `debug` hands it `debug`
  lines, and a logger filtering at `info` drops them; `console` has no filter of its own.

A per-call value that is not a level is ignored, and the call logs under the client's settings.

**Resolution.** A field whose value the SDK cannot honour falls back to its default, silently, and the
client still constructs. A `logging` record whose read throws — a throwing getter, a revoked proxy — is
the one failure: a `ConfigurationError` from the constructor, or the rejection of the one call that
passed it.

**OpenTelemetry spans, metrics and request-id propagation are not logging** — they belong on the
`fetch` seam, the one place that sees every outbound request, its status and its duration.

### Verify on the wire (first run of a new integration)

On a **successful** call the SDK returns only the decoded body — it never surfaces the request URL, the
verb or the status. So a wrong verb, a mis-serialized path segment or a dropped query parameter
**compiles cleanly** and produces no in-band signal; the only symptom is a runtime `404` or `422`. Turn
logging on at `info` for the first execution of any new call — `{APICLIENTTYPENAME}_LOG=info`, or
`logging: { level: "info" }` — and check five things in its `sending` line:

1. The **verb** matches the operation's **Wire** bullet in `map/operations/{resource}.md`.
2. The **base URL** is fully expanded — no leftover `{region}`-style server variable, which means a
   `baseUrl` you supplied carries a placeholder no declared variable fills.
3. The **path** is fully formed. Two different failures live here: a path field set to `null` collapses
   to **nothing**, leaving a doubled slash (`/orders//confirm`); a path field left `undefined` is
   rejected by its schema before anything is sent, as an `EncodeError` whose `uri` still shows the
   unfilled marker. The first is silent, so it is the one to look
   for.
4. Each **path segment** holds the value you meant — for an enum that is the **wire value**, not the
   member name.
5. The **query parameters** you set are present, spelled as their `Wire` names. A `null` or `undefined`
   query value is dropped entirely rather than sent empty, so an absent parameter usually means an
   absent field, not an encoding bug. The line masks a value whose key is off the safe list, so it
   shows that a parameter was sent, not what it held.

Then turn the level back down.

## Other work on the `fetch` seam

### Header injection

```ts
const client = new {Api}Client({
  fetch: (input, init) => {
    const request = new Request(input, init);
    request.headers.set("x-correlation-id", currentCorrelationId());
    return fetch(request);
  },
});
```

Set the header on a copy of the `Request` — the SDK has already put the content type and the
credential on it, and the copy keeps them, the body and the signal. Passing `{ headers }` as `init`
instead **replaces** every header the SDK set, the credential included. This is also the only
client-wide header mechanism: the
transport carries default header, query and path-parameter channels, but the generated client currently
wires all three as empty arrays. If a later generator version starts populating them, a header option
could appear on `ClientOptions` — read `src/client-options.ts` rather than assuming the field list is
frozen.

### Rate limiting

There is no built-in limiter. The default policy retries a `429` on an idempotent call and honours
its `Retry-After` (capped at 60 s), which absorbs an occasional limit; it does nothing to stop you
starting more calls than the provider allows. Put a concurrency/rate limiter around your calls for
that. Client-side limiting is the more predictable of the two under load — retrying into a rate limit
converts a fast failure into a slow one, and a fan-out of retrying calls keeps the pressure on.

### Circuit breaking

Count consecutive `ConnectionError`s, `TimeoutError`s and 5xx `ApiError`s, open the circuit for a
cool-off window, and fail fast while it is open. **Put the breaker around the SDK call, not in `fetch`.**
A plain `Error` thrown from a `fetch` wrapper reaches the loop as a `ConnectionError`, which is retried
with backoff — the opposite of failing fast. Around the call, the breaker sees one outcome per call,
after the retries, and its refusal never enters the loop.

## Proxies and TLS (Node)

Neither is a `ClientOptions` field. Both are properties of the **dispatcher** the `fetch` seam hands to
undici, so both are configured the same way:

```ts
import { ProxyAgent } from "undici";

const dispatcher = new ProxyAgent(process.env.HTTPS_PROXY!);
const client = new {Api}Client({
  fetch: (request) => fetch(request, { dispatcher } as RequestInit),
});
```

`dispatcher` is an undici extension, not standard `RequestInit`, hence the cast. The same seam takes a
custom TLS configuration, a connection-pool setting, or a unix-socket dispatcher.

⚠▶▶ **Node's global `fetch` ignores the proxy environment variables.** `HTTP_PROXY`, `HTTPS_PROXY` and
`NO_PROXY` do **nothing** to a `fetch` call by default — unlike most HTTP clients in other ecosystems,
and unlike `curl` in the same container. Undici reads them only through `EnvHttpProxyAgent`, and only
once you register it:

```ts
import { EnvHttpProxyAgent, setGlobalDispatcher } from "undici";

setGlobalDispatcher(new EnvHttpProxyAgent());   // now http_proxy / https_proxy / no_proxy apply
```

This is the usual reason an SDK call fails inside a corporate network while every other tool works.
`setGlobalDispatcher` affects the whole process, so in a library prefer the per-request `dispatcher`
above.

**Private CAs and client certificates** go on the dispatcher's `connect` options:

```ts
import { Agent } from "undici";
import { readFileSync } from "node:fs";

const dispatcher = new Agent({
  connect: {
    ca: readFileSync("/etc/ssl/corporate-root.pem"),         // a private CA bundle
    // cert / key: for mutual TLS, where the provider requires a client certificate
  },
});
```

`NODE_EXTRA_CA_CERTS` is the deployment-side equivalent for the CA case and needs no code change, but
it is read **once at process start** and is ignored if set later.

⚠ **Never reach for `rejectUnauthorized: false` or `NODE_TLS_REJECT_UNAUTHORIZED=0`.** They disable
certificate verification for traffic that carries a live credential, and the second one disables it
**process-wide**, for every other outbound call your service makes. Fix the trust store instead.

## Connection pooling

Pooling belongs to `fetch`, not to the client: on Node the global `fetch` shares one process-wide
undici dispatcher, so several SDK clients built over the default `fetch` share one pool and cost
nothing extra. Two consequences:

- **A dispatcher you create is a pool you own.** Build it once, beside the client, and reuse it. A
  `new Agent(...)` or `new ProxyAgent(...)` per request opens a fresh pool — and therefore fresh TCP
  and TLS handshakes — on every call, which is the same waste as a client per request without looking
  like one.
- **Pool limits live there too** — `connections`, `keepAliveTimeout`, `pipelining` on the `Agent`.
  Raise `connections` before assuming a provider is slow under a fan-out; the default cap can be the
  actual bottleneck.

Everything else about client lifetime — why the client itself must be long-lived, and what a per-request
client costs under OAuth — is **typescript-client-initialization**.

## What to reach for, by symptom

| Symptom | Where to look |
| --- | --- |
| calls never time out | a `fetch` replacement that does not forward the `Request`, or its `signal` |
| a header added in a `fetch` wrapper arrives, but every call is now a `401` | the wrapper passed `{ headers }` as `init`, which replaces the SDK's headers — copy the `Request` instead (*Header injection*) |
| request lines in the logs with no logging code | `{APICLIENTTYPENAME}_LOG` is set in that environment — set `logging.level` in code to own it |
| a JSON body or a card number in the logs | `logRequestBody`, or a per-call `level`, which turns the body on — see *Logging* |
| a failing call takes seconds longer to reject than the first failure | expected on an idempotent call: the default policy retried it — watch it with `retry.onRetry` |
| a `POST` fails on a `503` that a `GET` survives | expected: `POST` is outside the default `httpMethodsToRetry` |
| one handler takes far longer than `retry.timeout` | it is per attempt, and an idempotent call gets up to four — count the calls, then bound the handler with a signal |
| a page loop never returns | no provider-independent bound — see *Never leave a page loop unbounded* |
| requests still hit the real host under test | the wrong server **group** or **environment** overridden — check `src/servers.ts` |
| auth fails everywhere with credentials you know are right | `serverEnvironment` left to its default, which is the spec's **first** environment — often sandbox |
| the call works locally, fails behind a corporate proxy | Node's `fetch` ignores `HTTP_PROXY` — register `EnvHttpProxyAgent` or pass a `dispatcher` |
| a duplicate write despite an idempotency key | the key is generated inside the retried function — hoist it out; or your own retry layer re-calls the SDK, which mints a new injected key per call |
| ~16× the expected round-trips | a retry layer of your own stacked on the SDK's — set `retry: { maxRetries: 0 }` where you own retrying |
| a test with one stubbed `503` hangs, or runs out of queued responses | the default policy fetched it four times across ~7 s of backoff — see **typescript-testing** |
| a `{placeholder}` survives into the URL | a `baseUrl` you supplied names a variable the group does not declare |
| `EncodeError` whose `uri` still shows a `{placeholder}` | a path field was `undefined` — a required field was omitted |
| `ConfigurationError` about an unknown environment, thrown by the constructor | `serverEnvironment` is not a declared member |
| `DecodeError` "Expected an empty response body" | an event-stream response with no carrier — call it with `fetch` directly |
| a token is fetched on every call | a client built per request — see **typescript-client-initialization** |
| 401 on the first call, fine afterwards | expected: a 401 invalidates the token cache and is not in the default retry set |

## Next

- Injecting a fake `fetch` in tests → **typescript-testing**
- What each failure kind means → **typescript-error-handling**
- Options and client lifetime → **typescript-client-initialization**
- Credentials and the token endpoint's server group → **typescript-authentication**



<!-- Source: .agents/skills/typescript-calling-endpoints/SKILL.md; MIT; original SHA-256 2928c41f2c5b962af3c125c64a5dc6dc5ddacd9c3bc7e31a55d288fcf21f3282 -->

---
name: typescript-calling-endpoints
description: Calling operations on an APIMatic-generated TypeScript SDK — finding the resource that owns an operation, building the one flat channel-blind request object, required vs optional vs defaulted fields and the values that never appear on the request at all, passing a body, the ApiPromise return and the two ways to read it, bounded concurrency, and cancellation. Load before writing the first call to an SDK operation, or when an operation's shape or return type is unclear.
---

# Calling endpoints on an APIMatic TypeScript SDK

Operations are **methods returning `ApiPromise`** on the client. Most are **grouped under a resource
getter** and called `client.{resource}.{operation}(...)`; an operation the spec left untagged sits
**directly on the client**, called `client.{operation}(...)`. The resource getter, the exact operation
name and its signature come from the generated SDK map (grounded in `src/client.ts` and
`src/resources/`) — operation names follow no fixed verb/resource pattern, so take the real name from
the map, never from memory.

> Throughout this skill, `{...}` is a placeholder for a name you take from your SDK (e.g. `{Api}Client`,
> `{package-name}`, `{resource}`, `{Resource}`, `{Operation}`, `{Enum}`) — replace it with the concrete
> identifier from the source.

## Where to read the operation's shape

1. **`map/operations/{resource}.md`** (indexed from `sdk-map.md` at the package root) — the generated
   contract sheet. Per operation: the exact **Signature**, the **Wire** verb and route, **Auth**,
   **Request body**, **SDK-sent** fixed values, **Returns**, **Error** and its arms, then a **Fields**
   table (`Field` · `Channel` · `Wire` · `Type` · `Req` · `Default`) and a **Type sources** table naming
   the file under `src/models/` that declares each type. Start here. Operations that sit directly on
   the client get their own page there too.
2. **`api-reference.md`** — per-operation prose: a usage snippet, per-parameter descriptions, and the
   semantics that decide what you must pass (field interactions, ordering rules).
3. `src/client.ts` and `src/resources/{resource}.ts` — the source, when you need to confirm something
   the docs do not carry.

Both the docs and `src/` ship inside `node_modules/{package-name}/`, so read them there rather than the
compiled `dist/`. **Do not assume a `client.{resource}` level exists** — when the spec declares no tags,
or exactly one tag covering every operation, no resource classes are emitted at all.

Resource classes are exported from the package root, but only for their merged namespaces and for
`instanceof`. Never construct one: its constructor takes engine internals that are not exported.

## Method signature convention

Every operation has the same shape, with no positional overload and no sync variant:

```ts
{operation}(request: {Resource}.{Operation}Request, options?: RequestOptions): ApiPromise<T, E>
```

- **There is exactly one request parameter**, and it is **not optional** — even when every field on it
  is. An all-optional request still needs `{}` passed explicitly.
- **`options` is on every generated operation**, always last, always optional. It is
  `RequestOptions` = `{ signal?: AbortSignal; retry?: RequestRetryOptions }` and nothing else — see
  [Cancellation and per-call retry](#cancellation-and-per-call-retry).
- **An operation may declare no request parameter at all.** When every value the request carries is
  fixed by the spec, the generator emits no parameter and exports no request type, and `options` moves
  into first position. Check the **Signature** bullet before passing `{}` — it will not type-check
  against an operation whose only parameter is `RequestOptions`.

  ```ts
  await client.{resource}.{operation}();              // no request
  await client.{resource}.{operation}({ signal });    // options only
  ```
- **The map is the source of truth for the signature.** Whether a field is required, optional or
  defaulted — and whether the operation takes a body at all — varies per operation.
- **Return type** varies by operation — see
  [Making the call and reading the response](#making-the-call-and-reading-the-response).
- A non-2xx response **rejects** the promise unless you opt out with `.asApiResult()` — see
  **typescript-error-handling**.

## The request object is flat and channel-blind

There is **one** request parameter and it is **not nested by channel**. A field named `body` *is* the
whole request body; **every other field** is fanned out to the path, query string, headers or form body
by the SDK.

```ts
// Correct — flat, whatever channel each field travels on:
await client.{resource}.{operation}({
  collectionId: "abc123",     // travels in the path
  page: 2,                    // travels in the query string
  userAgent: "my-app/1.0",    // travels as a header
  body: { name: "My thing" }, // IS the request body
});

// Wrong — there is no channel nesting:
// await client.{resource}.{operation}({ path: { ... }, query: { ... } });
```

Which channel a field travels on is the `Channel` column of the operation's **Fields** table. Because
the request is a named object, getting the channel wrong is impossible — but you cannot *read* it off
the field list either, so the table is the only place to learn what went on the wire.

### Where a field lands — the rule

Each value the spec declares produces **one of four** outcomes, and the last one catches people out:

| What the spec declares | What you get |
|---|---|
| **required**, no fixed value | `f: T` — a required member of the request object |
| **optional** | `f?: T` — omit it and nothing is sent for it |
| a **default value** | `f?: T` — omit it and the SDK **still sends the default** |
| a **constant** value | **no field at all** — the value is baked into the request and you cannot change it |

Three consequences worth taking off the map before you write the call:

- **A constant appears in no signature and in no Fields table.** Its only listing is the operation's
  **SDK-sent** bullet, which spells each fixed pair as it goes on the wire. If you are hunting for a
  field to set a `Content-Type`, an API version or a fixed `grant_type` with, that is why you cannot
  find one — and there is no override for it short of wrapping `fetch`.
- **"Required" says nothing about the channel.** A required field may travel in the query, a header or
  the form body just as easily as the path; requiredness and channel are independent columns. Never
  infer one from the route.
- **Field names are the generated `camelCase` identifiers, not the wire names.** A header field
  `traceId` is transmitted as `X-Trace-Id`, and the `Wire` column is where that mapping lives — it is
  written only where the two differ, so a `—` means they match.

The request type is declared in the resource's merged namespace, so it is
`{Resource}.{Operation}Request` — importable from the package root if you want to name it:

```ts
import { {Resource} } from "{package-name}";

const request: {Resource}.{Operation}Request = { /* ... */ };
```

## Building request models

**A JSON, text or binary operation has a `body` field.** Where the API declares an
`application/x-www-form-urlencoded` or `multipart/form-data` request, the generator emits the parts as
**individual flat request fields** alongside the path and query ones and assembles the form itself —
there is no nested body object to construct and no `body` field to pass. The operation's **Request
body** bullet says which you are looking at; the signature settles it.

The runtime carries six request-body shapes: **empty, JSON, form-urlencoded, text, multipart and
binary**. An **XML** body has no carrier, so the operation is still emitted but **degrades to no body
field at all** — there is nothing to supply the payload through, and the request goes out with no
body. Its **Request body** bullet reads `none` in that case. If you need such an endpoint, call it
with `fetch` directly; the SDK cannot send it.

**A file field takes bytes, not a path.** Every binary `body` field and every multipart file field is
typed `FileInput`, which is a `Blob`, a `Uint8Array`, an `ArrayBuffer`, a `ReadableStream` of bytes,
any async iterable of them — which is what a Node `Readable` is — or a `{ data, fileName?,
contentType? }` wrapper around one. A filesystem path is **not** a file body: open it with
`createReadStream(path)` to stream it, or `await openAsBlob(path)` to send it with a
`Content-Length`. A field declared as an array of files takes `FileInput[]`, and the SDK sends one
part per element under the shared field name; an empty array sends no part at all.

Nothing about a file is schema-checked, so a wrong value throws at the call rather than rejecting on
the wire. The media type the SDK declares is a fallback: a `contentType` on the wrapper, or a
non-empty `Blob.type`, overrides it. A file name is yours or absent — the SDK never invents one, and a
part with no file name is read as an ordinary text field by many servers, so name a file you upload.

**A binary response is a handle, not a value.** Such an operation resolves to a `BinaryContent`:
`stream`, `contentType`, and a `fileName` parsed from `Content-Disposition` where the server sent one.
Read the stream exactly once — `new Response(file.stream)` to buffer it, a reader or `for await` to
stream it — or release it with `await file.stream.cancel()` if you decide not to. No timeout covers
the read, so an unread stream holds the connection until you read it, cancel it or abort the call's
`signal`. A server-chosen file
name is untrusted input: sanitise it before writing to disk.

For the JSON case, the `body` field's type is a generated model — a plain object literal, no builders.
Required members must be set; optional ones are omitted from the JSON when left `undefined`, except one
with a spec default (`s.defaulted(...)` in the model's schema), which the SDK fills in and sends. Take the
type's name and the file that declares it from the **Type sources** table:

```ts
const result = await client.{resource}.{operation}({
  body: {
    requiredProp: value,   // required members must be provided
    optionalProp: value,   // optional; unset means omitted, unless it has a spec default
  },
});
```

A body's **shape varies**: some are flat scalars, others nest an inner model. The **Fields** table and
the model file named beside it carry the real members.

**An optional-looking body is not permission to omit it.** A `body?: T` reflects what the *spec* marked
optional, not what the endpoint needs. A create whose body is optional in the spec type-checks with
`{}` passed and then fails at the provider. Where a call obviously needs a payload, pass one.

### Defaults are sent, not omitted

A field the spec gave a default is filled **by the SDK** when you omit it, and it goes on the wire.
Omitting such a field is therefore not "let the server decide" — the server sees the value. Which
fields have defaults is the `Default` column of the **Fields** table.

**And a default can silently narrow what comes back.** A defaulted field is *always sent*, so the
response you get is the one that default asked for, not the full resource. The two shapes that cost
people an afternoon:

- a representation or verbosity switch defaulting to the minimal form, so a create resolves to little
  more than an id, a status and some links;
- a field selector defaulting to one section, so whole branches of the response are simply absent.

Read the `Default` column **before** concluding the API dropped data — it was never requested.

### Every value is validated before anything is sent

Each field is schema-encoded on the way out. A wrong type or a malformed format (a bad date string,
say) rejects with an `EncodeError` — its `cause` the `SchemaError` naming the field — and **nothing is
sent**: no request reaches the network. That is an error in
your code, not an API failure; see **typescript-error-handling**.

## Enums

Enum fields take a member of the generated `const` object. The type alias is **open** — it carries a
`| (string & {})` (or `| (number & {})`) tail — so a raw string also type-checks:

```ts
import { {Enum} } from "{package-name}";

await client.{resource}.{operation}({ status: {Enum}.Active });   // preferred — a rename is caught
await client.{resource}.{operation}({ status: "active" });        // also compiles
```

Prefer the member: the string form silently survives a spec change that renames the value. See
**typescript-models** for read-back semantics and for guarding an unknown value off the wire.

## Union types, collections, and dates

Some fields are not plain scalars: `oneOf`/`anyOf`/polymorphic unions declared under
`src/models/unions/`, array and record collections, and `Date` fields whose wire format the schema pins
(ISO 8601, RFC 1123 or Unix seconds). If a request field or response member is one of these, see
**typescript-models** for how to build and read it.

## Making the call and reading the response

```ts
const value = await client.{resource}.{operation}({ /* ... */ });
```

> **Wrap the call in error handling — a non-2xx response *rejects*, it is not signalled by the return
> value.** The bare `await` above shows only the happy path. Before writing a real call, **load
> `typescript-error-handling`** for the `try`/`catch` shape and which error type to narrow on per
> operation — or use the non-throwing `.asApiResult()` form below.

Operations return `ApiPromise<T, E>`, a `Promise<T>` subclass. Two ways to consume it:

**Await it** — you get `T`, the decoded success body, and a non-2xx **rejects**.

**Call `.asApiResult()`** — you get a discriminated result, and an HTTP error status does **not** reject:

```ts
const outcome = await client.{resource}.{operation}({ /* ... */ }).asApiResult();

if (outcome.ok) {
  console.log(outcome.status, outcome.headers.get("x-request-id"), outcome.value);
} else {
  console.log(outcome.status, outcome.message, outcome.payload);   // the error's members, not the error
}
```

```ts
type ApiResult<T, E> =
  | { ok: true;  status: number; headers: Headers; value: T }
  | { ok: false; status: number; headers: Headers; message: string; method: HttpMethod; uri: string;
      payload: PayloadOf<E> };
```

Five things to know:

- **`.asApiResult()` must be called on the value the operation returned.** `ApiPromise` overrides
  `Symbol.species`, so `.then()`, `.catch()` and `.finally()` hand back a plain `Promise` and the
  method is gone. `op(...).then(x => x).asApiResult()` does not compile.
- **`.asApiResult()` still rejects for every other failure** — a body that would not decode, a value that
  would not encode, a connection error, a timeout, a credential that could not be obtained, or a caller
  abort. It converts only the *HTTP error status* branch into a value, so it still needs a
  `try`/`catch` around it.
- **On failure, `outcome` carries the error's own members, not the error object** — `status`,
  `headers`, `message`, `method`, `uri` and `payload` — so `outcome.payload.kind` narrows exactly as
  `err.payload.kind` would. The `ApiError` instance is not reachable through this path.
- **Nothing suppresses an unhandled rejection.** A call you never await that fails is reported by the
  runtime — `unhandledRejection` on Node, which by default ends the process. `.asApiResult()` marks the
  promise handled as its first act, so call it on the returned value in the same turn, and never start
  a call you do not consume.
- **Both paths read one underlying outcome**, so awaiting an `ApiPromise` *and* calling
  `.asApiResult()` on it issues no second request. The request goes out when the operation is called,
  not when you await it — which also means a call you build and hold has already been sent.

### Status and headers

An awaited value gives you **only** the decoded body. `status` and `headers` are reachable in exactly
two places: on `ApiResult` above, and on a rejected `ResponseError`. The raw `fetch` `Response` is
deliberately unreachable.

### The success type

`T` is whatever the operation's success body decodes to. The **Returns** bullet names it, and the cases
you will meet are:

- **A model type** — a JSON body decoded through the generated schema. The **Type sources** table names
  the file under `src/models/` where you read its shape; the map does not duplicate it.
- **A primitive** — a `text/plain` body decoded by the plain-text scalar decoder, not by a model.
- **`undefined`** — the operation's success response has no body. That is a real value, not a mistake:
  the decoder asserts the body is empty, and a non-empty one rejects with `DecodeError`.

**On an `undefined` operation, resolving *is* the success signal.** Do not bind the value and do not
test it — success is "did not reject", exactly as for the others. Two follow-ons: if you need the
resulting state, re-read it with a separate call; and if you need to tell a `200` from a `204`,
`.asApiResult()` is the only place the status appears.

Endpoints in the same family can differ, so let each operation's own **Returns** bullet decide how you
read it.

## Cancellation and per-call retry

`RequestOptions` is the entire per-call surface:

```ts
type RequestOptions = {
  signal?: AbortSignal;
  retry?: RequestRetryOptions;   // Pick<RetryOptions, "maxRetries" | "timeout" | "statusCodesToRetry">
};
```

`retry` overrides three fields of the client's retry policy for this call alone, field by field — a
field you leave out keeps the client's value:

```ts
await client.{resource}.{operation}({ /* ... */ }, { retry: { maxRetries: 0 } });    // one attempt
await client.{resource}.{operation}({ /* ... */ }, { retry: { timeout: 5_000 } });   // 5 s per attempt
```

There is **no** per-call header, base URL or auth override, and the type admits no other retry field
(though the runtime honours one it is handed) — those belong on
`ClientOptions` at construction (**typescript-client-initialization**), and the retry policy's other
fields on `ClientOptions.retry` (**typescript-configuration-resilience**).

```ts
const controller = new AbortController();
setTimeout(() => controller.abort(new Error("too slow")), 5_000);

await client.{resource}.{operation}({ /* ... */ }, { signal: controller.signal });
```

An already-aborted signal rejects immediately. See **typescript-configuration-resilience** for
deadlines across a whole call and for combining signals.

Three mechanics that decide how you catch the result:

- **Your signal and each attempt's `retry.timeout` race the same internal controller**, so an
  attempt ends on whichever fires first. `retry.timeout` bounds **one attempt**, in milliseconds, even
  when set per call — an idempotent call that keeps failing gets up to four of them, plus backoff — so
  a signal plus your own timer is how you bound the whole call. An abort also cuts a backoff wait short,
  and is never retried.
- **An abort rejects with the signal's own `reason`, unwrapped, and a timeout with `TimeoutError`**
  once no retry is left.
  Whatever you passed to `controller.abort(reason)` — or the `DOMException` a bare `abort()` supplies —
  is what the call rejects with, so it is **not** an `{Api}Error`; the timeout is the SDK's own and
  stays in the family.
- **Neither is an `ApiError`.** A `catch` that narrows on `ApiError` — or on an operation's declared
  error class — will **not** match an abort, a timeout or a connection failure. See
  **typescript-error-handling** for a ladder over the whole family, and for rethrowing what is outside
  it.

## Concurrency

There is nothing to serialize — the client is stateless apart from its token cache, and that cache is
concurrency-safe (one in-flight token acquisition is shared). A handful of independent calls can go out
together:

```ts
const [a, b] = await Promise.all([
  client.{resource}.{operationA}({ /* ... */ }),
  client.{resource}.{operationB}({ /* ... */ }),
]);
```

**Bound it once the list is data rather than two literals.** `Promise.all` over an array opens as many
simultaneous requests as the array is long, against a provider that rate-limits. The SDK retries a
`429` on an idempotent call, honouring `Retry-After`, but every one of those calls then retries after
a similar wait — jitter spreads them by a quarter at most — keeping the pressure on, and a write
outside the retry gate simply fails. Cap the width:

```ts
async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += limit) {
    results.push(...(await Promise.all(items.slice(i, i + limit).map(fn))));
  }
  return results;
}

const all = await mapLimit(ids, 10, (id) => client.{resource}.{operation}({ id }));
```

Note that `Promise.all` rejects on the first failure and leaves the rest of the batch running
unobserved; `Promise.allSettled` is usually what you want when partial success is acceptable.

Nothing is paginated and nothing is async-iterable, so there is no `for await` form. If an operation
returns a page, advance its page or cursor field yourself in a loop — see
**typescript-configuration-resilience**.

## Worked example — a list/GET call

```ts
// Signature (illustrative — take the real one from map/operations/{resource}.md):
//   {operation}(request: {Resource}.{Operation}Request, options?: RequestOptions):
//     ApiPromise<{Model}, ApiError>
//
// Fields:  collectionId  path   string   yes
//          status        query  {Enum}   no
//          page          query  number   no   default 1
//          perPage       query  number   no   default 20

import { {Enum} } from "{package-name}";

const outcome = await client.{resource}.{operation}(
  {
    collectionId: "abc123",
    status: {Enum}.Active,
    perPage: 100,
    // page omitted — the SDK still fills and sends its default of 1
  },
  { signal: controller.signal },
).asApiResult();

if (!outcome.ok) {
  console.error(outcome.status, outcome.message, outcome.payload);
} else {
  for (const item of outcome.value.{items}) {
    console.log(item.id);
  }
}
```

> This operation's success body is a model that nests its list under a member, so you read that member
> and then iterate. Another operation may return the array directly, or a primitive, or `undefined`.
> Check its **Returns** bullet.

## Next

- Build bodies, unions, collections, dates, enums → **typescript-models**
- Errors and status codes → **typescript-error-handling**
- Timeouts, the retry policy, logging, base URL, paging → **typescript-configuration-resilience**



<!-- Source: .agents/skills/typescript-error-handling/SKILL.md; MIT; original SHA-256 3ea93f37a6c50a1f8d9f43e25d6ae584d09fdc60bc57056d25e309161637f4a4 -->

---
name: typescript-error-handling
description: Error handling for an APIMatic-generated TypeScript SDK — load before writing any try/catch around an SDK call, an error-translation layer, or middleware. Covers the one error family and its closed err.kind, the four throwables that sit outside it, which types actually reach your catch blocks, reading the status and the declared error body safely, the default arm that degrades instead of throwing, the failures the non-throwing form does not convert, the missing field that is silently undefined rather than an error, and the traps that make an otherwise reasonable catch ladder silently wrong.
---

# Error handling for an APIMatic TypeScript SDK

> Throughout this skill, `{...}` is a placeholder for a name you take from your SDK (e.g. `{Api}Client`,
> `{Api}Error`, `{package-name}`, `{Resource}`, `{Operation}`, `{arm}`) — replace it with the concrete
> identifier from the source.
>
> **One skill, every error shape.** This file covers every shape the generator can emit. Which shapes
> YOUR SDK uses — whether an operation declares typed arms or rejects with the base error, what each
> arm is called, which status it covers — are facts of the API definition, not of this skill: take
> them from the operation's page in `map/operations/{resource}.md` and **apply only the guidance that
> matches**. An API can declare typed errors on every operation, on none, or on a mix.

Operations are **throw-based** (for a non-throwing alternative, see **The non-throwing form** below),
and every **operational** failure belongs to **one family**: `{Api}Error`, a union over six leaves.
One `instanceof {Api}Error` sees all of them, and `err.kind` says which one it is. Four throwables sit
**outside** the family — a configuration fault, a codec called directly, a bug, and a caller abort —
so a `catch` that tests the family has to rethrow whatever is left.

```ts
import { {Api}Error } from "{package-name}";

try {
  await client.{resource}.{operation}({ /* ... */ });
} catch (err) {
  if (err instanceof {Api}Error) {
    switch (err.kind) {
      case "api":
        // The API answered with an error status — read err.status and err.payload.
        break;
      case "decode":
        // The answer did not fit the spec — read err.status and err.cause.
        break;
      case "encode":
        // Nothing was sent — err.cause is the SchemaError that rejected the value.
        break;
      case "connection":
      case "timeout":
      case "auth":
        // No response was produced — err.kind says which.
        break;
    }
  } else {
    throw err;   // outside the family: an abort's reason, a configuration fault, or a bug
  }
}
```

Every member of the family names the call it raised: `err.method` and `err.uri`, and `err.message`
opens with that pair — `"POST https://api.example.com/v1/{resource} failed with 422"`.

## What to import, and from where

Everything below comes from **one specifier — the package root**. Deep imports
(`{package-name}/core/…`) do not resolve: the `exports` map exposes `.` and `./package.json` and
nothing else.

| import | what it is |
| --- | --- |
| `{Api}Error` | the whole family — a type **and** a value. The type is the union of the six leaves; the value is the abstract class they all extend, so `instanceof` and `err.kind` select the same set. It cannot be constructed or extended. The SDK-branded alias of `CoreError`, which is not exported under its own name |
| `ResponseError` | the part of the family the server answered on — `ApiError \| DecodeError`, the two that carry `status` and `headers`. A type and a value, like `{Api}Error` |
| `ApiError` | `kind: "api"` — the API answered with an error status. The base every operation without declared error bodies rejects with, and the class every per-operation error extends |
| `{Resource}.{Operation}Error` | the generated `ApiError` subclass for an operation that declares error bodies, on the **resource class's merged namespace** — not a free-standing export |
| `DecodeError` `EncodeError` `ConnectionError` `TimeoutError` `AuthError` | the other five leaves |
| `ConfigurationError` `SchemaError` | outside the family: a constructor fault, and a codec called directly |
| `type ErrorKind` `ErrorPayload` `Declared` `Undeclared` `HttpMethod` | type-only helpers, if you name them in your own signatures |

`{Api}Error` is the SDK-branded name — **read the real one** from the `CoreError as …Error` line in
`src/index.ts`. It is the API name plus `Error` (`Acme` gives `AcmeError`), escalating to
`{Api}ApiError` and then a numeric suffix when that would collide with something the same clause
already re-exports (an API named `Api` cannot take `ApiError`).

Everything under `src/core/` is vendored static code, **byte-identical in every generated TypeScript
SDK**, so the behaviours below hold without checking yours. What varies per SDK is which operations
declare arms, and what those arms are called.

## The family — every `err.kind`

`ErrorKind` is closed, so a `switch` over `err.kind` is exhaustive:

| `err.kind` | Class | What happened | Adds |
| --- | --- | --- | --- |
| `"api"` | `ApiError` | the API answered with an error status | `status` · `headers` · `payload` |
| `"decode"` | `DecodeError` | the answer could not be turned into the declared value — the body was not JSON, failed its schema, arrived where none is declared, or died mid-read after the response line | `status` · `headers` |
| `"encode"` | `EncodeError` | a request value did not match its declared type, so **nothing was sent** | — |
| `"connection"` | `ConnectionError` | `fetch` rejected before a response line arrived | — |
| `"timeout"` | `TimeoutError` | an attempt ran out its `retry.timeout`, and no retry was left | `timeout` — the budget that ran out |
| `"auth"` | `AuthError` | a credential could not be **obtained** | — |

Every one carries `kind`, `method`, `uri`, `message` and, where there was an underlying failure,
`cause`. `uri` is the absolute URL the call dialled, with the server variables expanded and the path
parameters filled. It carries no query, fragment or userinfo, so no query parameter reaches it — a
credential sent in the query included. One failure names an unresolved URI: a path parameter rejected
by its schema arrives as an `EncodeError` whose `uri` still shows the unfilled `{braces}`.

⚠ **`err.message` never carries a value from the wire.** It is the call plus what went wrong —
`"GET https://… failed with 404"`, `"… failed: Response body could not be decoded."` — never a body,
a header or a value that failed its schema. That keeps response bodies and secrets out of logs and
stack traces by default, which is a sound default and a trap: a handler that logs `err.message` and
nothing else records that something failed and discards every diagnostic. Read `err.payload` (or
`err.cause`) explicitly and log the fields you choose — and on a `4xx` the caller caused, also put the
API's reason in your response.

`err.headers` is the `fetch` `Headers` object, not a plain object — look a header up with
`err.headers.get("x-request-id")` (case-insensitive). Indexing it (`err.headers["x-request-id"]`) is
always `undefined`, and spreading it gives you nothing.

## Four throwables outside the family

`instanceof {Api}Error` is `false` on each of these, so a `catch` that tests the family and then
stops has swallowed nothing — it just has to **rethrow the rest**, as the ladder at the top does.

- **`ConfigurationError`** comes out of the **client constructor**, synchronously and before any
  call exists: no reachable `fetch`, a basic-auth username containing a colon (RFC 7617 §2), or an
  unknown `serverEnvironment`. It is not a call failure, so it names no call. Wrap construction too
  if it runs on a path that must not crash.
- **`SchemaError`** is what a model's schema value throws when **you** call it directly —
  `{model}Schema.decode(json)`. Through an operation the same failure arrives one level down, as the
  `cause` of a `DecodeError` or `EncodeError` that does name the call. Its `message` names the field
  and the type expected, never the value; `cause` carries the issue list. A `serverOptions` override
  whose value is not a string raises it from the constructor too.
- **A bug reaches you raw** — a `baseUrl` that does not parse, or a non-file value where a `FileInput`
  was declared, is a plain `TypeError` naming no call.
- **A caller abort arrives as the signal's own `reason`**, unwrapped — whatever you passed to
  `abort()`, or the `DOMException` a bare `abort()` supplies. It is yours, not the SDK's, so it is
  deliberately not in the family, and never retried. The per-attempt `retry.timeout` is the SDK's own
  and **does** stay in it, as a `TimeoutError`.

`ConfigurationError` and `SchemaError` are exported from the package root; the other two are not the
SDK's to export.

## `"api"` — the API answered

```ts
class ApiError {
  readonly kind: "api";
  readonly status: number;           // the HTTP status
  readonly headers: Headers;         // the response headers
  readonly payload: /* the decoded error body, as a discriminated union */;
  readonly method: HttpMethod;       // the call it names
  readonly uri: string;
}
```

`status` and `headers` are always there, for any error status, declared or not — you never have to
choose between a typed body and knowing the status. Anything outside `200`–`299` is an error status,
so a `3xx` lands here too.

### Which error does an operation reject with?

Four places give you the answer, in order of preference:

1. **`map/operations/{resource}.md`** — the operation's **Error** bullet names the case, and for a
   typed operation the **Error arms** bullet lists every arm with the status each covers and whether it
   has a body. Start here.
2. **The **Signature** bullet on the same page** — the same fact as the second type argument of the
   returned `ApiPromise<T, E>`.
3. **`api-reference.md`** — per-operation prose, when you need what an arm *means* rather than its
   shape.
4. **`src/resources/{resource}.ts`** — the source. The subclass's `static readonly errors` table is
   the matcher list itself: one row per arm, each spelling `on` (the status, a `[from, to]` range, or
   `"default"`), `kind`, and the decoder.

All of these ship inside `node_modules/{package-name}/`, so read them there rather than the compiled
`dist/`.

- **Case A — typed arms.** The spec declared failure bodies, so the generator emitted a subclass named
  `{Operation}Error`, exported from the **enclosing class's merged namespace** — you catch
  `{Resource}.{Operation}Error`, or `{Api}Client.{Operation}Error` for an operation the spec left
  untagged. It redeclares `payload` with the operation's own arms. Narrow on `err.payload.kind`.
- **Case B — no typed arms.** `E` is the **base `ApiError`**, its payload is always the
  `"undeclared"` arm, and there is no subclass to catch.

Guessing wrong is *sometimes* a compile error and sometimes not, and the direction that looks safe is
the dangerous one. A subclass that does not exist fails to compile — that guess TypeScript catches. But
naming a **neighbouring** operation's error class compiles cleanly, because it is a real type, and then
never matches at runtime: the rejection sails past your `catch` and surfaces somewhere else, or not at
all. Take the case from the map every time; the compiler is not a check on this.

### Case A — reading the typed payload

> **This section applies only where the operation declares typed arms.** An operation whose **Error**
> bullet names the base `ApiError` has nothing to narrow — its payload is always `"undeclared"`.
> Skip to **Case B**.

`err.payload` is a discriminated union with **one arm per failure response the spec declared**, plus
`"undeclared"`. Two things about arm names catch people out:

- **The name comes from the body's schema, not from the status.** An arm whose body is a direct model
  reference is named after that model in lower camel (`validationError`); anything else — a
  primitive, an array, a map, or no content — is named `error{Status}` (`error400`, `error4XX`,
  `errorDefault`). So two statuses that return the *same* model give you two arms whose names differ
  only by a numeric suffix (`validationError`, `validationError2`). Read the arm names off the map;
  do not derive them from the status.
- **One arm can still cover many statuses** — not because two statuses were merged, but because the
  spec declared a *range* or a `default:`. A `4XX` arm covers `[400, 499]`; a `default:` arm covers
  **every error status no other arm covers**, `3xx` included. Check `err.status` when you need the
  specific one.

```ts
import { {Resource} } from "{package-name}";

try {
  await client.{resource}.{operation}({ /* ... */ });
} catch (err) {
  if (err instanceof {Resource}.{Operation}Error) {
    switch (err.payload.kind) {
      case "{arm}":
        // err.payload.body is the declared model for this arm (or undefined if the arm declares none)
        console.error(err.status, err.payload.body);
        break;
      // ... KEEP GOING: one case for EVERY arm the map lists — do not stop early ...
      case "undeclared":
        console.error(err.status, new TextDecoder().decode(err.payload.rawBody));
        break;
    }
  } else {
    throw err;   // every other failure, for the rest of your ladder
  }
}
```

**`"undeclared"` is always an arm, and it is not a catch-all.** It carries
`{ kind: "undeclared"; rawBody: ArrayBuffer }` and fires **only** for a status no declared arm covers
— or, where the operation declares a `default:` arm, for a body that arm could not decode. A status
that has an arm lands in that arm and leaves `"undeclared"` unreached — so a `catch` that handles only
`"undeclared"` silently drops every typed body. Handle every arm the map lists, and put `"undeclared"`
last. There is no operation whose failure is guaranteed typed: the generator emits the `"undeclared"`
arm unconditionally, so any operation can hand you raw bytes for a status it does not document.

An arm can declare **no body** (`body: undefined`) — the spec named the status but gave it no schema.
It accepts only an **empty** body: any body on a status it covers (a JSON error message is typical)
rejects with `DecodeError`, even through `.asApiResult()`, and `err.status` still names it (see
**`"decode"`**). On a `"default"` arm that body degrades to `"undeclared"` instead.

**The arms are per operation, and are not one set across the API.** A description that declares a
different error schema per tag gets a different model — and therefore a differently-named arm — per
tag, so a branch written against one operation's arm does not apply to a sibling's. Take the arms from
that operation's **Error arms** bullet every time; never reuse a set from a neighbouring call.

Where your boundary treats several arms alike, group them with fall-through cases rather than
repeating the body — but only over fields they **all** declare:

```ts
switch (err.payload.kind) {
  case "{arm1}":
  case "{arm2}":
    // narrowed to {arm1} | {arm2} — only their common fields are reachable here
    report(err.status, err.payload.body);
    break;
  case "undeclared":
    report(err.status, new TextDecoder().decode(err.payload.rawBody));
    break;
}
```

### Case B — the base `ApiError`

Nothing to narrow — and the obvious test narrows **nothing**. On the base `ApiError` the payload's
`kind` is typed `string`, so `err.payload.kind === "undeclared"` leaves `payload` unnarrowed and
`rawBody` unreachable. Test for the member instead:

```ts
import { ApiError } from "{package-name}";

try {
  await client.{resource}.{operation}({ /* ... */ });
} catch (err) {
  if (err instanceof ApiError) {
    console.error(err.status, err.headers.get("x-request-id"));
    if ("rawBody" in err.payload) {
      console.error(new TextDecoder().decode(err.payload.rawBody));
    }
  } else {
    throw err;
  }
}
```

`rawBody` is bytes, not text, and a Case B body may not be JSON at all — a gateway or proxy can answer
with HTML or plain text. Decode it to a string before you try to parse it, and expect the parse to fail.

### Matcher precedence

For a subclass with several arms, the runtime matches in **three passes**: an exact numeric status
across the whole table first, then the first covering range, and last a `"default"` arm where the
spec declared one. So a specific `404` arm beats a `4XX` arm regardless of declaration order, and a
`default:` arm can never shadow a narrower one.

A body that does not fit the arm it matched is a **`DecodeError`** — except on `"default"`, which
describes no status in particular and so **degrades to the `"undeclared"` arm**, raw bytes and all,
rather than throwing.

### Catch order

`instanceof` narrows from most specific to least, and every generated subclass extends `ApiError`,
which is itself in the family — so the subclass test must come first or it is unreachable:

```ts
try {
  await client.{resource}.{operation}({ /* ... */ });
} catch (err) {
  if (err instanceof {Resource}.{Operation}Error) {
    // typed arms available on err.payload.kind
  } else if (err instanceof ApiError) {
    // any other operation's error status — payload is "undeclared"
  } else if (err instanceof {Api}Error) {
    // every other kind: decode, encode, connection, timeout, auth
  } else {
    throw err;
  }
}
```

## `"decode"` — the answer did not fit

A `DecodeError` means the API **did** answer — it carries `status` and `headers` — but the body could
not be turned into the declared value. `cause` says how: a `SchemaError` when the body did not fit its
contract, a `SyntaxError` when it was not JSON, or the platform's read fault when the body died
mid-stream after the response line. A body arriving where the operation declares none has no `cause`.

Which status it came on matters a lot, and `err.status` tells you:

- **On a success status** — the API answered `2xx` and the SDK could not decode the body. The outcome
  is genuinely **unknown**: the call may have taken effect.
- **On a declared error arm** — the API rejected the request and only the *detail* was lost. The
  status survives on the `DecodeError`, so you still know it was, say, a `422`.

Mapping both onto one 5xx is wrong half the time — it tells a retrying caller to keep retrying
something that can never succeed. Only a **declared** arm can decode-fail: the `"undeclared"` arm reads
raw bytes and never decodes, and a `default:` arm degrades instead of throwing.

```ts
if (err instanceof DecodeError) {
  console.error(err.status, err.message);   // the call, and that the body did not decode
  console.error(err.cause);                  // the SchemaError naming the failing field, or the parse fault
}
```

## `"encode"` — nothing was sent

An `EncodeError` means a request field failed encoding, so **no request reached the network**. This is
a bug in your code (a wrong type, a bad date format), not an API failure. Never retry it, and do not
let a production ladder quietly absorb it — it should fail loudly in development. Its `cause` is the
`SchemaError` that rejected the value, and that error's `message` names the field.

## `"auth"` — a credential could not be obtained

**`AuthError` is about obtaining a credential, not about being refused one.** A 401 *from the API* is
an `ApiError` like any other status, so one `catch` arm cannot absorb the other.

A 401 does have one auth consequence: it **invalidates whatever that operation's scheme had cached**,
so the **next** call re-acquires. `401` is not in the default `statusCodesToRetry`, so the current
request fails and recovery happens on the following call. To have the current call re-sent with a
fresh token instead, add `401` to `statusCodesToRetry`: every attempt resolves its credential again, so
the retry carries the re-acquired token. A static key is re-sent unchanged, so that only helps a scheme
that fetches its credential.

`AuthError` means the token grant failed, every configured branch of an alternatives requirement
failed, PKCE was disabled without a client secret, or your own authorization-code prompt rejected. Its
`method` and `uri` name **the operation you called**, not the token endpoint. When the grant failed,
**`.cause` is the token endpoint's own `ApiError`** — that is where the token endpoint's status and
body are, and the only place a "bad client credentials" diagnosis can be read. Never log an `AuthError`
without its `cause`.

An **alternatives** requirement falls through: a configured scheme that throws is not the end of it,
the next configured one is tried, and only when all of them have failed does it throw. When exactly
one was configured, its failure surfaces as it would from that scheme alone — a refused token endpoint
is still an `AuthError` with the endpoint's `ApiError` on `.cause`, never the bare `ApiError`.
Otherwise it is an `AuthError` whose `cause` is an `AggregateError` holding what each branch threw, in
the order tried. An abort or a timeout escapes immediately rather than being collected.

Auth resolves *before* the request is sent, so an `AuthError` means **nothing was sent** — it is an
auth fault, not a rejection. Check it early in your ladder.

⚠ **The token is acquired lazily, on first use — so an auth misconfiguration surfaces from an
operation call, not from client construction.** The rejection points at whichever operation happened to
run first, which reads like a problem with that operation rather than with the credentials you wired
up. It also rejects in `.asApiResult()` mode, for the same reason: the grant happens before a request
exists to return a result for.

## A missing field is not an error — it is `undefined`

This is the gap the error types leave, and the one most likely to reach production. A model member the
description did not mark **required** is emitted as `member?: T` over an optional schema entry, so a
response that simply **omits** it validates cleanly. No `DecodeError` is thrown, and nothing warns you:

```ts
const value = await client.{resource}.{operation}({ /* ... */ });  // 200, truncated body
value.{member};   // undefined — not an error, and not a null you declared
```

A `DecodeError` on a success status means a **type** mismatch or an unparseable body, not an absent
field. So the guard belongs on the value, not in the `catch`:

```ts
const value = await client.{resource}.{operation}({ /* ... */ });
if (value.{member} === undefined) {
  throw new MyProviderUnreadable("{operation} returned no {member}; outcome unknown");
}
```

**Assert on the members you actually depend on, right after every call that matters.** For a write, an
absent identifier has the same "outcome unknown" character as a decode failure — the call may have
taken effect and you cannot name what it created. Which members are required is the `Req` column of the
operation's **Fields** table; nothing in the SDK checks the rest for you. The same is true of a **typed
error arm**: an arm whose fields are all optional will accept almost any JSON object, so
`err.payload.kind === "{arm}"` does not guarantee `err.payload.body.{member}` is there. See
**typescript-models**.

## The non-throwing form

`.asApiResult()` turns the **HTTP error status** into a value. It does **not** make the call
non-throwing: every other failure still rejects.

```ts
try {
  const outcome = await client.{resource}.{operation}({ /* ... */ }).asApiResult();

  if (outcome.ok) {
    use(outcome.value);
  } else {
    // outcome.status, outcome.headers, outcome.message, outcome.method, outcome.uri, outcome.payload
  }
} catch (err) {
  // still needed — decode, encode, connection, timeout, auth and a caller abort land here
}
```

The split is mechanical: **`200`–`299` is `ok: true`, every other status is `ok: false`.** No nuance,
no per-status judgement. Reach for it when an error status is an expected outcome (a `404` meaning "not
found yet", a `409` meaning "already exists") and you would otherwise be using exceptions for control
flow, or when you need `status` and `headers` on the *success* path.

Two mechanics to know: the failure branch is a plain object carrying **the error's own members under
their own names** — `status`, `headers`, `message`, `method`, `uri` and `payload` — never the error
instance, so you narrow on `outcome.payload.kind` exactly as you would on `err.payload.kind`, and a
handler moves between the two forms by swapping the prefix; and `.asApiResult()` must be called on the
value the operation returned, **before any `.then()`**, because `ApiPromise` overrides
`Symbol.species` and the method is gone from what `.then()` hands back (see
**typescript-calling-endpoints**).

⚠ **This mode is not rejection-free, and the cases it does not convert are the ones people assume it
does.** A decode failure is not an API error status, so it propagates in both modes rather than
becoming an `ok: false` value — a `DecodeError` on a `2xx` body, and a `DecodeError` on a **declared
error arm**, both still reject. So does a failed token acquisition, because the credential is resolved
before anything is sent, and so does a caller abort. `try`/`catch` is still required around
`.asApiResult()`; it narrows what you catch, it does not remove the need to catch.

## Transport failures, and guarding every call site

`"api"` covers only the case where the API answered. It does **not** cover a host that is unreachable,
DNS that failed, a connection that dropped, or an attempt's timeout elapsing — those are
`"connection"` and `"timeout"`, and a `catch` whose only arm is `err instanceof ApiError` lets them
escape and take down whatever was running the call.

**Every one of them reaches you after the retries are spent.** On a `GET`, `HEAD`, `PUT` or `OPTIONS`
call the default policy re-sends a `408`, `429`, `500`, `502`, `503` or `504`, a connection failure
and a timeout up to
three times before the call rejects, so what you catch is the **last** attempt's failure — an
`ApiError` for the final status, or a `ConnectionError` or `TimeoutError` — in exactly the shape it
would have had with retrying off. A write outside `httpMethodsToRetry` rejects on its first failure.
Do not retry a family error the SDK already retried; see **typescript-configuration-resilience**.

**Unlike SDKs that let their HTTP library's exceptions through, this one wraps them.** Whatever your
`fetch` rejects with becomes a `ConnectionError`, with the original on `.cause` — so your boundary
never imports the transport's exception types, and it does not need revisiting when you swap `fetch`
for a wrapper. Two things pass through unwrapped: anything that is already in the family (a
`{Api}Error` your own wrapper threw), and a cancellation — the caller's own abort `reason`, or the
SDK's `TimeoutError` when an attempt's timeout fired, whatever your `fetch` rejected with. If you wrap
`fetch` to add a guard (**typescript-configuration-resilience**), throw a family error from it or
accept that yours will arrive as `err.cause` — and know that a plain error thrown there is a
`ConnectionError` the retry loop retries.

**Convert the family to your own error type in one place.** If you wrap the SDK behind your own
abstraction (a client interface, a service, a repository), do the conversion at that boundary so the
rest of the code has one failure type to handle:

```ts
class MyUpstreamError extends Error { status: number; reason: string | undefined; constructor(status: number, reason: string | undefined, opts?: ErrorOptions) { super(reason, opts); this.status = status; this.reason = reason; } }

function translate(err: unknown): never {
  // Most specific first — the typed subclass, then any other error status.
  if (err instanceof {Resource}.{Operation}Error && err.payload.kind === "{arm}") {
    throw new MyUpstreamError(err.status, err.payload.body?.{reasonField}, { cause: err });   // one branch per arm the map lists; join a list of reasons
  }
  if (err instanceof {Api}Error) {
    switch (err.kind) {
      case "api": {
        if (err.status === 429) throw new MyRateLimitedError(err.headers.get("retry-after"), { cause: err });
        // Every arm without its own branch lands here — raw bytes, or a declared arm's body. `reasonIn` is YOUR
        // helper: parse, take the reason field, join a list, cap the length; nothing usable (an HTML page) → undefined.
        const reason = reasonIn("rawBody" in err.payload ? err.payload.rawBody : (err.payload as { body?: unknown }).body);
        throw new MyUpstreamError(err.status, reason, { cause: err });
      }
      case "timeout":
      case "connection":
        // Nothing was learned about the request's fate. For a write, that is "unknown", not "failed" —
        // the bytes may have reached the API before the failure. Tell the caller that, don't say it failed.
        throw new MyTransientError({ cause: err });
      case "decode":
        // The API answered and the body was unreadable — err.status says whether it was a success.
        throw new MyProviderUnreadable(err.status, { cause: err });
      case "encode":
      case "auth":
        throw new MyIntegrationDefect(err.message, { cause: err });
    }
  }
  throw err;   // an abort's reason, a configuration fault, or a bug
}
```

Always pass `{ cause: err }` — the SDK's own errors chain their underlying failure that way (an
`AuthError` hides the token endpoint's `ApiError` there, a `DecodeError` or `EncodeError` the
`SchemaError` naming the field), and dropping the link is what makes production diagnosis hard.

**Guard every call site, not just the ones that change data.** It is easy to wrap the calls that create
or modify something and overlook the calls that only read — especially reads on a routine path (loading
a screen, a scheduled job, a startup or health check). A connection failure during a read fails just as
hard as one during a write. A call left unguarded next to one that is guarded is the one that breaks.

⚠ **A rejection you never await is an unhandled rejection**, exactly like any other promise's:
`unhandledRejection` on Node — which by default ends the process — and `unhandledrejection` in a
browser. Await every call, or attach your own handler. `.asApiResult()` marks the promise handled as
its first act, so call it on the value the operation returned, in the same turn.

## Presenting failures at your boundary — coherent, distinct, leak-free

The catches above decide what you catch; this decides what the caller (an HTTP response, a UI layer,
another service) sees. Get it wrong and every failure looks the same, or an internal diagnostic ends up
on the wire. Three rules, applied at the one boundary where SDK failures become your own error type:

**Handle each failure kind the same way everywhere.** One mapping from failure kind → outcome, applied
identically at every call site — same order, same conversion. When the same kind of failure becomes a
different result on a different operation, callers cannot reason about it.

**Keep distinct failures distinct.** An `ApiError` always hands you `status`, so that is your
discriminator — and where the operation declares arms, `payload.kind` says more than the status does,
because it names the *body* the API sent rather than the class of failure. Carry whichever you keyed on
into your own error type; a status dropped at this boundary cannot be recovered downstream. Collapsing
everything into one blanket status (502 for all of it) throws away the only signal that separates "you
sent something invalid" from "the provider is down".

One ladder, in the single place where your error type becomes a caller-facing status. This is where the
discriminator you carried gets read back — a ladder with **no branch reading it** is incomplete:

```ts
function toHttp(err: unknown): { status: number; message: string } {
  // OUR quota is spent — the caller did nothing wrong and cannot fix it.
  if (err instanceof MyRateLimitedError) return { status: 503, message: "Temporarily unavailable." };

  if (err instanceof MyUpstreamError) {
    // OUR credentials — likewise not the caller's to fix.
    if (err.status === 401 || err.status === 403) return { status: 502, message: "Provider unavailable." };
    // The provider rejected THE CALLER'S request — hand back the same status and its reason.
    if (err.status >= 400 && err.status < 500) return { status: err.status, message: err.reason ?? "Request rejected." };
    return { status: 502, message: "Provider error." };
  }

  // Transport, timeout, provider 5xx — no meaningful caller status.
  if (err instanceof MyTransientError) return { status: 502, message: "Provider unreachable." };
  return { status: 500, message: "Unexpected error." };
}
```

**Not every provider failure is the caller's fault.** A `401`/`403` means *your* credentials are wrong
and a `429` means *your* quota is spent — passing either straight through tells the caller they are
unauthenticated or throttled when they are neither. Those belong in the 5xx bucket; validation,
conflict and not-found are the caller's to fix. And keep the default arm at 5xx: a status you have not
mapped is an unknown, not a caller error — the provider can add one without warning you.

**An unreadable body is not one case but two — decide which before you map it.** A `DecodeError` on a
**success** status is genuinely unknown: 5xx. One on an **error** status is not — the provider rejected
the request and only the *detail* was lost, so answering 5xx tells a retrying caller to keep retrying
something that can never succeed. `err.status` is what separates them; the type alone does not.

**Never map a decode failure onto a domain absence.** "I could not read the answer" is not "the
provider said no." It is tempting on a lookup — an unreadable body and a genuine miss both leave you
without a record — but only one of them is a *fact*. Where a lookup gates a create, that conversion
turns a corrupt response into a spurious create; more generally it produces a confident wrong answer,
which is worse than an error. If the operation's miss really is signalled by an empty body, match on
*empty*, not on *unparseable*.

**Never put an SDK `message` on the wire.** It names the call — the method and the URL your service
dialled, path parameters included — and that is a diagnostic for your logs, not copy for your caller.
Log the SDK error with its `cause`; return a message you wrote — or, for a `4xx` the caller caused, the
API's own reason from `err.payload`.

## `instanceof` across the ESM/CJS boundary

`instanceof` is reliable **within one dialect**. A process that loads both — `import` in one file,
`require` in another — gets **two independent copies** of every error class, and `instanceof` across
that boundary is `false`. It fails silently: a `catch` arm simply never matches.

If your process might do that, narrow on a value instead — every member of the family carries `kind`:

```ts
// The family, dialect-safe:
if (typeof err === "object" && err !== null && "kind" in err && "uri" in err) { /* err.kind */ }
```

`err.name` is also stable across copies (each class sets it from its own constructor name).

## Notes

- **Retries are on by default.** An idempotent call is retried on `408`, `429`, `500`, `502`, `503`,
  `504`, a dropped
  connection and a timeout, honouring `Retry-After`, before it rejects; a write is not, unless its
  method is in `httpMethodsToRetry`. The error you catch is the last attempt's. See
  **typescript-configuration-resilience**.
- **A single `401` is not a permanent credential failure.** It invalidates the cached token and, by
  default, is not re-sent; the caller sees that one `401`, and the *next* call acquires afresh. Do not tear down a
  client or alert on one.
- **Failures are logged only when you turn logging on.** Logging is off by default; with
  `ClientOptions.logging` on, the SDK writes a `warn` line for a non-`2xx` response and an `error` line
  for a call that ends on a fault or on a credential it could not obtain (see
  **typescript-configuration-resilience**). Neither is a substitute for handling the error: log what
  your own code decided in your `catch`.
- **No raw `Response`.** `status` and `headers` are on `ApiResult` and on a `ResponseError`; the
  `fetch` `Response` is deliberately unreachable.
- **A missing credential is not an error.** An unset credential member sends no credential, so the
  failure surfaces as an `ApiError` `401` from the API rather than anything at construction — which
  reads like an expired token instead of a config bug. This holds for composite schemes too: a
  partially configured `all`/`any` scheme sends what it has rather than refusing, so there is no local
  "auth could not be satisfied" rejection to catch. See **typescript-client-initialization**.
- **SDK errors do not survive a worker or process boundary intact.** `structuredClone` and
  `postMessage` reduce an `Error` subclass to a plain `Error` — `name`, `message` and `cause` survive;
  `kind`, `method`, `uri`, `status` and `payload` do not. Convert to your own serializable shape
  *before* you post it, not after.

## Next

- Timeouts, cancellation, the retry policy → **typescript-configuration-resilience**
- Asserting error paths in tests → **typescript-testing**
- Which arms an operation declares → `map/operations/{resource}.md`, the **Error arms** bullet



<!-- Source: .agents/skills/typescript-models/SKILL.md; MIT; original SHA-256 e2a647da586d7b444ea1b8e571bd6106f28b7e8db033dd2ccfe4a6b1102af9a7 -->

---
name: typescript-models
description: Working with models in an APIMatic-generated TypeScript SDK — building request bodies from plain object literals, required members and optional-versus-nullable fields, open enums, discriminated and undiscriminated unions, the four date codecs, and the schema companion beside every type. Load before constructing a request payload or mapping SDK models onto your own domain types.
---

# Working with models in an APIMatic TypeScript SDK

Every model is a plain `type` — **not a class**. There is no constructor, no builder and no default
export: you build one with an object literal and read one with plain property access.

```ts
import { type {Model}, {model}Schema } from "{package-name}";

const body: {Model} = { {requiredField}: "..." };
```

**There is exactly one spelling.** No companion dict type, no builder, no factory and no static
helper: an object literal is how every model is built, at every nesting level. And **nothing is
frozen** — no property is emitted `readonly`, so a decoded response is an ordinary mutable object.
Mutating one is allowed but is not a wire operation: what you changed reaches the API only by passing
the value to an operation, or by re-encoding it yourself.

Two exports per model — the type and a `{model}Schema` value — and both come from the **package
root**; deep imports do not resolve. This skill covers the **non-obvious model shapes** that trip
integrations up. The patterns are generic across APIMatic TypeScript SDKs; take the real type and
field names from the contract sheet — the **Models** section of `sdk-map.md` and the **Type sources**
table on the operation's block in `map/operations/*.md`, both grounded in the `src/models/` the
package ships — never from a compiled `dist/`, and never from a path derived off the type name. The
`Source` column is where to **read** a shape, never what to import.

> Throughout this skill, `{...}` is a placeholder for a name you take from your SDK (e.g. `{Model}`,
> `{Union}`, `{Variant}`, `{Enum}`, `{package-name}`) — replace it with the concrete identifier from
> the source.

## Where a model lives

| Group (as `sdk-map.md` names it) | Directory | What is emitted |
| --- | --- | --- |
| Objects, and `allOf` (flattened) | `src/models/` | one `type` with the properties, plus its schema |
| Enums (open; const companion plus schema) | `src/models/` | `as const` object + open type alias + schema |
| Discriminated unions (`oneOf`) | `src/models/unions/` | union of tag-narrowed arms + dispatching schema |
| Unions without a discriminant (`anyOf`) | `src/models/unions/` | a bare union type + an accepting schema |

Two consequences worth internalising. **`allOf` is flattened** into one plain object type — every
constituent's properties restated on one type, with no inheritance, no base type to assign to and
nothing recording the composition. And **an object schema that `allOf` subtypes made a polymorphic
base is emitted as a discriminated union**, not as a base type, so it lands under `unions/` too:
there is nothing to upcast to, and you narrow on the tag instead.

## Required, optional, nullable

```ts
type {Model} = {
  id: string;               // required
  label?: string;           // optional — omit the key
  retiredAt: Date | null;   // required AND nullable — null is a value, distinct from omitted
  note?: string | null;     // both — omit it, or send null
};
```

Optional properties are declared `f?: T`, **not** `f?: T | undefined`. The SDK itself compiles under
`exactOptionalPropertyTypes` and `verbatimModuleSyntax`, and where your project does too you must
**omit or spread** an absent field rather than assign `undefined` to it:

```ts
const bad: {Model}  = { id: "1", label: undefined };                          // does not compile
const ok: {Model}   = { id: "1" };                                            // omit
const also: {Model} = { id: "1", ...(label !== undefined ? { label } : {}) };  // conditional
```

At run time an explicit `undefined` is dropped from the JSON anyway (a property with a spec default
sends its default instead, below), so that one is a type-level constraint. `null` is not: a nullable field set to `null` sends JSON `null`, which is a different
request from an absent key — the distinction that matters on a PATCH.

**A model property with a spec default is optional in the type and `s.defaulted(...)` in its schema.**
Omitting it, or passing `undefined`, still sends the default (on a partial update, send its current value
instead), and a response that omits it reads back as the default.

### Reading one back

An absent optional is simply `undefined` (one with a spec default reads back that default) — there
is no sentinel value to import and nothing to
compare against, so `?.` and `??` are the whole toolkit, and, on a property without a spec default, `!== undefined` is the precise test when
"present but empty" and "absent" are different facts. Under `noUncheckedIndexedAccess` an array index
is `T | undefined` too, so guard `items[0]` before reaching through it.

⚠ **A response type whose spec marks nothing required decodes an empty body without complaint** —
every property reads back `undefined`, or its default, and nothing throws. A truncated or partial body is therefore
not an error, it is a model full of `undefined`; check the properties you actually depend on. A
property that is required on a request type and optional on the response type is normal and
intentional — two schemas for one concept — so never infer the response shape from the request shape.
Both are in the map: the operation's **Fields** table for the request, the **Type sources** file for
the response.

## Polymorphic union types: discriminated and undiscriminated

A `oneOf` with a discriminator becomes a union whose arms are the variant types **intersected with
the tag literal that selects each one**, beside a schema that dispatches on that tag:

```ts
// src/models/unions/{union}.ts
export type {Union} = ({VariantA} & { {tag}: "a" }) | ({VariantB} & { {tag}: "b" });

export const {union}Schema = s.discriminatedUnion<{Union}>("{wire_tag}", {
  a: {variantA}Schema,
  b: {variantB}Schema,
});
```

An `anyOf` becomes a bare union with nothing to switch on — `export type {Union} = string | {Model}`
— and its schema tries the arms in **declaration order**, first match winning, so overlapping arms
are resolved by order.

⚠ **A payload matching no arm throws.** Both kinds fail the decode — through an operation as a
`DecodeError` whose `cause` is the `SchemaError`, through a schema you call directly as the
`SchemaError` itself — an unrecognized tag has no arm to dispatch to, and an undiscriminated union that matches nothing has no
arm to fall back on. You do not get a null union or an unset variant. A provider that adds a variant
your SDK predates turns into a decode failure on a call that was previously fine, so a union field is
a place to expect regeneration pressure. See **typescript-error-handling** for where that surfaces in
a catch ladder.

### Construct

Write the arm's object literal directly; there is no factory, no static helper and no wrapper type.

```ts
const method: {Union} = { {tag}: "a", /* the rest of {VariantA} */ };
```

**Include the tag.** It is part of the union arm, and the schema puts it on the wire from the value
you pass. The catch is that the tag lives on the *arm*, not on the variant type: a value typed
`{VariantA}` does not carry it, so building one and then passing it where `{Union}` is expected fails
to compile. Build against the union type, or spread the variant and add the tag.

### Read / narrow

```ts
switch (value.{tag}) {                 // discriminated: the arms are exhaustive, no fallback needed
  case "a": return handleA(value);     // narrowed to the {VariantA} arm
  case "b": return handleB(value);
}

if (typeof other === "string") { /* ... */ } else { /* the model arm */ }   // undiscriminated
```

An undiscriminated union has nothing to switch on, so narrow it yourself with `typeof`, an `in`
check, or `Array.isArray`.

The tag property name on the **decoded** object is not necessarily the wire discriminator — a variant
that renamed it has the rename applied on the way out, so the type alias spells what arrives while
the schema names what was sent. Take the exact tag and arm names from the **Unions** table in
`sdk-map.md` (`Union` · `Variants` · `Narrow with` · `Source`) rather than deriving them.

A union the spec left unconstrained degrades to `unknown`. That is the generator reporting that the
spec constrained nothing, not a bug.

## Collections

Array properties are `T[]`; maps and free-form objects are `Record<string, T>` (an API-definition map
is always string-keyed). Pass a plain array or a plain object — there is no wrapper and nothing to
convert.

| Value | On the wire |
| --- | --- |
| omitted / `undefined` | key absent, or the spec default if it has one |
| `null` on a nullable field | `null` |
| `[]` | `[]` |
| `{}` | `{}` |

## Dates & numbers

- **A date-bearing field's wire format is fixed per field, and you cannot substitute another.** All
  three instant kinds are typed `Date` while being three different things on the wire, so the type
  alone does not tell you which — read the field's combinator in `src/models/{model}.ts`.

  | Field's schema | Wire form | Model type |
  | --- | --- | --- |
  | `s.dateTime()` | offset-bearing ISO 8601 — `"2024-06-17T15:30:00Z"` | `Date` |
  | `s.rfc1123DateTime()` | HTTP-date — `"Mon, 17 Jun 2024 15:30:00 GMT"` | `Date` |
  | `s.unixSecondsDateTime()` | epoch **seconds** — `1718638200` | `Date` |
  | `s.dateOnly()` | `"2024-06-17"` | `string` — **not** a `Date` |

  Pass a `Date` and let the schema encode it; never hand-format one. Two traps: `s.dateTime()`
  **requires the offset**, so a bare `"2024-06-17T15:30:00"` and a date-only `"2024-06-17"` both
  fail; and a **`s.dateOnly()` field is a `string`**, so `new Date(...)` there is a type error and
  formatting `"YYYY-MM-DD"` is yours to do.

- **Every numeric kind is a `number`; the schema says which check runs.** `int32` and `int64` are
  checked with `s.int()`, which rejects a fraction and anything outside the safe-integer range.
  `float`, `double` and a big-decimal are checked with `s.float64()`, which rejects `NaN` and
  `±Infinity`. Neither checks the `int32` or `float` range. An `int64` past
  `Number.MAX_SAFE_INTEGER` is rejected rather than rounded, so treat a large-integer field as
  something to verify against the provider rather than as a safe round-trip.

- **There is no decimal type.** A `number` is an IEEE-754 double, so a spec that models money as a
  number hands you binary floating point and the usual accumulation errors. Many APIs instead model
  money as a **`string`** scaled to the currency (`"10.00"`) — where yours does, keep it a string end
  to end: formatting it through `Number` and back is what silently turns `"10.10"` into `10.1`.

- **A field the spec pinned to one value** is typed as that literal and checked with
  `s.literal(...)`: `status: "accepted"` admits that one value and nothing else, in either direction.

## Bytes

A binary or file-typed field is `Uint8Array` in the model and a base64 `string` on the wire; the codec
runs both ways, so pass bytes, not base64:

```ts
const body: {Model} = { payload: new TextEncoder().encode("hello") };
const text = new TextDecoder().decode(model.payload);
```

That is for base64-in-JSON fields only, and it is **not** the file-upload carrier. The engine does
send raw-binary and multipart bodies, but a file there is a `FileInput` — bytes the transport frames
rather than a value a schema encodes — and the two deliberately never unify: a decoded `Uint8Array`
field is not assignable to a file field, and `new Uint8Array(value)` is the one-copy bridge (see
**typescript-calling-endpoints**).

## What the schema checks — and what it does not

Model schemas are built on `zod/v4-mini`, and what they verify is much narrower than what the API
definition said. Checked: the **primitive type** of each property, the presence of required keys, the
four date formats, base64, a pinned literal, and a union's arms. Not checked — because the generator
does not transcribe these at all, so there is no attribute to read and no validator to invoke:

- **String formats.** A uuid, email, uri, hostname, ip, password, json-pointer, regex-constrained
  string and a bare `time` are all emitted as plain `string` with `s.string()`. Nothing validates the
  shape in either direction: an email field accepts `"not an email"` and sends it.
- **Bounds and lengths.** No `minLength`, `maxLength`, `minimum`, `maximum`, `multipleOf`,
  `uniqueItems` or `pattern` reaches the generated code.
- **`additionalProperties: false`.** Not enforced; see *Unknown / future fields* below.

The provider is therefore the only enforcer of those, and it enforces them as a `400` you have to
interpret. Where you want a client-side guard — worth it on user-supplied input before a write, where
a rejected request costs a round-trip and an error path — write it at your own boundary and read the
constraints from `api-reference.md`, which does carry the API's documented contract.

What the schema *does* check, it checks in **both** directions: encoding runs before the request is
built, so an invalid model rejects the call with an `EncodeError` — its `cause` the `SchemaError`
naming the field — and **nothing is sent**. Read that failure as the SDK
catching your mistake at the point you made it, not as an upstream fault — the compiler catches the
shape and the schema catches the values, and between them very little reaches the network wrong. In
production, catch it at the boundary where *you* assemble a payload from external input and treat it
as a 4xx on your own API.

## Enums

Enums are **not** TypeScript `enum`s. Each is an `as const` companion object plus an open type alias
and a schema:

```ts
export const {Enum} = { Active: "active", Retired: "retired" } as const;
export type {Enum} = (typeof {Enum})[keyof typeof {Enum}] | (string & {});
export const {enum}Schema = s.enumOf<{Enum}>({Enum});
```

- **The name is a value and a type at once.** Import it *without* `type` wherever you use its members
  — `import { {Enum}, {enum}Schema } from "{package-name}"` — since a type-only import makes
  `{Enum}.Active` a compile error. Prefer the member over the bare literal: a spec change that
  renames the value then fails to compile instead of failing in production.
- **The type is open.** The `(string & {})` tail — `(number & {})` on a number enum — means any value
  of the base type is assignable.
- **The schema validates the base type only, never membership.** A string enum accepts any string, a
  number enum any number, so a value the provider added after generation round-trips instead of
  throwing. That is deliberate, and it is why a `switch` over a **received** enum value needs a
  `default` arm — the opposite of a discriminated union, whose unrecognized tag does throw.

```ts
if ({enum}Schema.values.includes(received)) { /* a member this SDK knows */ }
```

`.values` is the declared set in declaration order, and the only runtime membership test on offer.
There is no coercion helper — no `fromValue`, no lookup function — because a member *is* its wire
value: `{Enum}.Active === "active"`, `` `${{Enum}.Active}` `` is `"active"`, and a value read off a
response compares directly against the member. Member *names*, on the other hand, are generated
identifiers rather than wire values — a number enum's members are named `_0`, `_1`, … — so take the
names and their values from the `as const` companion in the enum's own file.

## JSON key renaming happens invisibly

A model's property names are TypeScript-cased; the wire names may differ. The mapping is a `_keysMap`
entry inside the schema literal, applied on decode and encode both, and carrying only the properties
that actually moved:

```ts
export const {model}Schema = s.object<{Model}>({
  createdAt: s.dateTime(),
  _keysMap: { createdAt: "created_at" },
});
```

So you always write `createdAt` and the wire always carries `created_at`. You never spell a wire name
— except when you are staring at a captured HTTP body wondering why the key does not match. The
divergences are listed once, in the **Wire-name divergences** table in `sdk-map.md` (`Type` ·
`Property` · `Wire key`); every property absent from that table uses its TypeScript name verbatim.

## Unknown / future fields

Model schemas are built on a **loose** object, so keys the model does not declare are **kept**, not
stripped, in both directions — a field the provider added after this SDK was generated survives
decoding and round-trips back out on encode. `additionalProperties: false` changes nothing about
this.

There is no typed bag to read them from, though, and no member on the type:

```ts
// Decoding: the key is on the object but not in the type.
const extra = (model as Record<string, unknown>)["x_experimental"];

// Encoding: extra keys on a value you pass are sent. Excess-property checking catches them on a
// fresh object literal, but not on a value that arrived through a variable.
```

The keys are **wire names** — there is no property, so nothing maps the casing for you here. And a
field you depend on that has no typed property is a regeneration signal: prefer regenerating the SDK
from a spec that describes it over building program logic on stringly-typed lookups.

The same symmetry is a debugging trap on the way out: a **misspelled** property is not an error
either, it is an extra key that gets sent and ignored. So when a value you set is not taking effect,
check the spelling against the type before suspecting the API — excess-property checking only catches
it on a fresh object literal, never on a value that reached the call through a variable.

## The schema companion

You do not need `{model}Schema` for ordinary calls — the SDK encodes requests and decodes responses
itself. It is there for when you hold the wire shape yourself:

```ts
const model = {model}Schema.decode(JSON.parse(rawWebhookBody));  // validates and renames keys
const wire  = {model}Schema.encode(model);                       // exactly what the SDK would send
const back  = {model}Schema.decode(JSON.parse(JSON.stringify(wire)));
```

Both directions throw `SchemaError` on mismatch and produce nothing partial. Using a schema on
inbound data the SDK did not hand you — a webhook body, a queue message, a cached blob — is the
intended use, and gives you exactly the validation the SDK applies to a response.

Do **not** `JSON.stringify` a model directly for storage, or hand a raw model to anything that will
encode it — a web framework's response serializer, a cache, a queue. `JSON.stringify` writes
TypeScript-cased keys, ISO strings for every date whatever the field's wire format, and turns a
`Uint8Array` into an index-keyed object (`{"0":104,"1":105}`) rather than base64. Decoding that back
fails on the renamed keys and the wrong date formats, silently, and the bytes are simply gone. Either
map the model into your own type at the boundary, or go through `encode` and hand out its result.

See [reference.md](reference.md) for the per-shape reference: the full spec-kind-to-type table, the
schema surface, and the failures each date codec produces.

## Next

- Pass models to an operation → **typescript-calling-endpoints**
- `SchemaError`, and the `DecodeError` or `EncodeError` it arrives on → **typescript-error-handling**



<!-- Source: .agents/skills/typescript-testing/SKILL.md; MIT; original SHA-256 8c9e0eaf79cab03ee846694c344195d18a0fe213a2ceda8fa5cdebdc5ed1ef60 -->

---
name: typescript-testing
description: Testing code that calls an APIMatic-generated TypeScript SDK — which seam to fake (`ClientOptions.fetch`, or an interceptor at the global-fetch layer), stubbing bodies in wire shape, asserting the request the SDK actually built, covering the error and decode-failure paths, turning the on-by-default retry policy off (or testing it deliberately), and keeping tests independent of SDK internals. Load before writing tests for the integration layer.
---

# Testing code that uses an APIMatic TypeScript SDK

The client takes a `fetch` implementation on its options object, and that is the seam for testing: pass
a function that returns a `Response` and no real network calls happen. The SDK ships no mocking
helpers, no test doubles and no recorded fixtures — this is standard TypeScript. No interceptor
library, no `nock`, no `msw` required.

```ts
const client = new {Api}Client({ fetch: async () => jsonResponse(200, { id: "1" }) });
```

**Match the project's existing test stack — don't impose one.** Check the test dependencies and the
existing tests, then mirror both its **runner** (Vitest / Jest / `node:test`) and its **assertion
style**: if it uses `node:test` with `assert`, or an assertion library, write assertions that way
rather than switching. The samples below use a `describe`/`it`/`expect` style **purely for reference**
— they show the SDK testing seam and *what* to assert, not a mandated runner or matcher library.
Substitute your own `{Api}Client` and operation names as well.

> Throughout this skill, `{...}` is a placeholder for a name you take from your SDK (e.g.
> `{Api}Client`, `{package-name}`, `{resource}`, `{Resource}`, `{Operation}`, `{scheme}`) — replace it
> with the concrete identifier from the source.

## A reusable fake fetch

`ClientOptions.fetch` is typed `typeof fetch`, so a fake needs no base class, no registration and no
mocking library — just a function:

```ts
type Call = { url: URL; request: Request; body: string | undefined };

function stubFetch(responder: (url: URL, request: Request) => Response | Promise<Response>) {
  // Every request, in order — the token fetch appends too, so this is what you count.
  const calls: Call[] = [];

  // Typed as `typeof fetch` so a signature drift is a compile error, not a runtime surprise. The SDK
  // calls it with one `Request` and no `init`; wrapping both in a `Request` also accepts a direct call.
  const fetch: typeof globalThis.fetch = async (input, init) => {
    const request = new Request(input, init);
    const body = request.body === null ? undefined : await request.clone().text();
    const call = { url: new URL(request.url), request, body };
    calls.push(call);
    return responder(call.url, request);
  };

  return { fetch, calls, last: () => calls[calls.length - 1]! };
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status });
}

function emptyResponse(status = 204): Response {
  return new Response(null, { status });     // what an operation returning `undefined` expects
}

/** Answer requests in order — the shape most tests want. */
function queue(...responses: Response[]) {
  const pending = [...responses];
  return () => {
    const next = pending.shift();
    if (next === undefined) throw new Error("stub fetch ran out of queued responses");
    return next;
  };
}
```

Wire it in and you have a real client with no network:

```ts
function clientReturning(...responses: Response[]) {
  const stub = stubFetch(queue(...responses));
  const client = new {Api}Client({
    fetch: stub.fetch,
    retry: { maxRetries: 0 },          // one request per call — see *Notes*
    {scheme}: { /* ... */ },
  });
  return { client, stub };
}
```

**`retry: { maxRetries: 0 }` is load-bearing.** Retries are on by default, so without it a stubbed
`503` on a `GET` is fetched four times across about 7 s of backoff, and a queue holding one response
runs out on the second attempt. Leave it on every test client that is not *about* retrying.

**Logging is off unless the environment turns it on.** A test client with no `logging` reads
`{APICLIENTTYPENAME}_LOG` (the client class name in upper snake case, plus `_LOG`) like any other, so a CI job
that exports it fills the test output with request lines. Set `logging: { level: "off" }` where that
matters, or pass a `logger` that records its calls when the test is *about* what gets logged.

`Response` is global on Node 18+. Credentials can be dummy values, or omitted entirely — nothing
validates them when the transport is stubbed, unless the test is *about* the credential.

**Do not mock the client, its resource classes, or reach for its internals.** `#rawClient` and the
other private fields are genuinely unreachable, and a hand-rolled double of `{Api}Client` cannot catch
the mistakes that actually happen — a wrong path parameter, a body that does not encode, a header you
forgot. Faking `fetch` exercises the real request-building pipeline; that is the whole point. Never
construct a resource class either: it is exported only for its merged namespace and for `instanceof`,
and its constructor takes engine internals that are not exported.

> **If your client has an OAuth 2 scheme, the first request your stub sees is the token request**, not
> your operation. See **Fake an OAuth token endpoint** below before writing the first test — a
> single-response fake fails there in a confusing way.

## Stub bodies are in WIRE shape, not model shape

Every response is decoded through the operation's schema, so a stub body must be what the API would
actually put on the wire:

- **wire key spellings**, not the camelCase members — `created_at`, not `createdAt` (the `_keysMap` in
  `src/models/{model}.ts` gives the mapping);
- **wire date formats** — an offset-bearing ISO string, an HTTP-date, or epoch **seconds**, per the
  field's schema combinator;
- **every required field present.**

Get a required one wrong and the call rejects with `DecodeError` before your assertion runs — which
reads as a mysterious failure until you read its `cause`, a `SchemaError` whose message names the
failing path and the expected type exactly. Get an **optional** one wrong and nothing fails at all: model schemas are
**loose**, so an unrecognized key is preserved rather than rejected, the member reads back `undefined`,
and the test passes for the wrong reason. Two shortcuts close that gap:

```ts
const wireBody = {model}Schema.encode(someModel);            // round-trip a model to a valid wire body
expect(() => {model}Schema.decode(fixture)).not.toThrow();   // validate a hand-written fixture once
```

Prefer the first: build the fixture as a typed model and encode it, so a member rename breaks the
fixture instead of passing a stale test. Validate any fixture you hand-write and reuse — it catches
fixture rot when the SDK is regenerated. Both schema consts are exported from the package root.

## Test a success path

```ts
it("returns the decoded model", async () => {
  const { client } = clientReturning(jsonResponse(200, { id: "1", created_at: "2024-06-17T15:30:00Z" }));

  const result = await client.{resource}.{operation}({ /* ... */ });

  expect(result.id).toBe("1");
  expect(result.createdAt).toEqual(new Date("2024-06-17T15:30:00Z"));   // Date, decoded for you
});
```

An operation whose success type is `undefined` needs a genuinely **empty** body — `emptyResponse()`.
A response with a body makes the call fail with `DecodeError`; to test that, stub the body on a `200` —
`new Response(body, { status: 204 })` throws `TypeError`.

## Test an error path

A non-2xx status rejects with the operation's error class, and the reason lives in `err.payload` — a
discriminated union keyed by the declared response **schema**, not by the status
(**typescript-error-handling**). Which class and which arms an operation has is the **Error arms**
bullet in `map/operations/{resource}.md`, so assert the pair that matches your operation.

**Case A — the operation declares error bodies**, so it has a generated `{Resource}.{Operation}Error`:

```ts
import { {Resource} } from "{package-name}";

it("surfaces the declared 400 arm", async () => {
  const { client } = clientReturning(jsonResponse(400, { message: "bad input", code: "invalid" }));

  try {
    await client.{resource}.{operation}({ /* ... */ });
    throw new Error("expected a rejection");
  } catch (err) {
    expect(err).toBeInstanceOf({Resource}.{Operation}Error);
    const e = err as {Resource}.{Operation}Error;
    expect(e.status).toBe(400);                            // always present, whichever arm you got
    expect(e.payload.kind).toBe("{arm}");                  // narrow before reading the body
    if (e.payload.kind === "{arm}") expect(e.payload.body.message).toBe("bad input");
  }
});
```

The error body is decoded through **its** schema, so it is wire-shaped on the same terms as a success
body.

**Case B — the operation declares no error bodies.** It rejects with the base `ApiError`, whose
payload is always the `"undeclared"` arm — **raw bytes**, not a decoded body. Its `kind` is typed
`string`, so test for `rawBody` to reach the bytes:

```ts
import { ApiError } from "{package-name}";

const e = err as ApiError;
expect(e.status).toBe(422);
expect(e.payload.kind).toBe("undeclared");
if ("rawBody" in e.payload) expect(new TextDecoder().decode(e.payload.rawBody)).toContain("bad input");
```

**Take the arm union from the contract sheet per operation.** `"undeclared"` is reachable in Case A
too — any status the operation's matchers do not cover falls to it — so an error test copied from a
sibling operation can pass for the wrong reason, landing in the `"undeclared"` branch and asserting
nothing about the typed body you meant to check.

Use `try`/`catch` rather than a rejection matcher: matcher support for narrowing a rejected value
differs between runners, and the `catch` form reads the same everywhere.

These prove the reason is on the SDK error, not that the caller sees it. Also test through your own boundary:
fake the API's `4xx` with a reason and assert the reason is in **your** response — a test that checks
only the status passes on code that logs the reason and drops it.

## Test the result-style (`asApiResult`) variant

`.asApiResult()` turns the error-status branch into a value, so there is nothing to catch — stub the
response and assert on the returned `ApiResult` directly. The split is mechanical: **2xx is
`ok: true`, every other status is `ok: false`**, and both carry `status` and `headers`.

```ts
it("reports the failure without throwing", async () => {
  const { client } = clientReturning(jsonResponse(400, { message: "bad input" }));

  const outcome = await client.{resource}.{operation}({ /* ... */ }).asApiResult();

  expect(outcome.ok).toBe(false);
  if (!outcome.ok) {
    expect(outcome.status).toBe(400);
    expect(outcome.payload.kind).toBe("{arm}");   // the error's own members, not the error object
  }
});
```

On success the value is `outcome.value` (not `.data`), and `outcome.headers` is the only way to read
**response headers** — so this is also the mode to test in when your code depends on a header on the
*success* path. `.asApiResult()` does **not** make the call non-throwing: everything in the next
section still rejects, and it must be called on the value the operation returned, before any
`.then()`.

## Assert the outgoing request

`expect(stub.calls).toHaveLength(1)` proves only that something was sent. Assert the things a
regression would actually change:

```ts
it("sends the right request", async () => {
  const { client, stub } = clientReturning(jsonResponse(200, { id: "1" }));

  await client.{resource}.{operation}({ {pathField}: "abc", {queryField}: 2, body: { name: "x" } });

  const { url, request, body } = stub.last();
  expect(request.method).toBe("POST");
  expect(url.pathname).toBe("/{expected}/{route}/abc");                    // path field substituted
  expect(url.searchParams.get("{wire-query-name}")).toBe("2");             // query lives on the URL
  expect(request.headers.get("content-type")).toBe("application/json");
  expect(JSON.parse(body!)).toEqual({ name: "x" });                        // wire keys, wire dates
});
```

- **The SDK hands the fake one `Request` and no `init`.** Its `url` is absolute, so
  `new URL(request.url)` gives you `pathname` and `searchParams` for free rather than substring-matching
  a URL string. A fake that reads `init` reads nothing.
- **Header names are lowercased.** The SDK normalizes every layer — the endpoint's, the auth scheme's
  and the client's defaults — before merging, which is what makes the merge case-insensitive, and
  `request.headers` is a `Headers`. Read it through `request.headers.get(...)`; a plain
  `request.headers["Authorization"]` is both the wrong type and the wrong case.
- **The body is already serialized by the time the fake sees it.** The captured `body` is the request
  body's **text** (or `undefined`), which is all a JSON, form-urlencoded or text body needs, and it
  uses **wire aliases**, because that is what encoding produces. Assert on the parsed string; do not
  "fix" the aliases in the test. Read a multipart or binary body back off the captured `request`
  instead: a multipart one with `await request.formData()`, and a binary one with
  `new Uint8Array(await request.arrayBuffer())` — its text is lossy. A multipart `content-type`
  carries a generated boundary, so match it as a prefix, never with `toBe`. Compare a file part by its
  contents, `await new Response(form.get("{field}")).text()`: one sent without a file name may come
  back as a string or a `File`.
- **A list-valued query or form parameter has a per-parameter wire style.** The `StyledParam` the
  generator emitted for it in `src/resources/{resource}.ts` carries a `style`: `plain` (the default —
  `name=a&name=b`), `indexed` (`name[0]=a`, percent-encoded in the raw URL as `name%5B0%5D=a`),
  `unindexed` (`name[]=a`), or `csv` / `tsv` / `psv` (one joined value). Read it before asserting:

  ```ts
  expect(url.searchParams.getAll("{name}")).toEqual(["a", "b"]);   // plain — get() returns only the FIRST
  expect(url.searchParams.get("{name}[0]")).toBe("a");             // indexed
  expect(url.searchParams.getAll("{name}[]")).toEqual(["a", "b"]); // unindexed
  expect(url.searchParams.get("{name}")).toBe("a,b");              // csv
  ```

  Object-valued parameters flatten to `key[sub]=value`. Path and header arrays are not configurable —
  both fold to one comma-separated value.
- The expected verb and route are the operation's **Wire** bullet in `map/operations/{resource}.md`,
  and the channel each field travels on is its **Fields** table. Take them from there — a field's
  channel is not derivable from its name.

Worth asserting once, somewhere, because they are silent when wrong:

- **The value actually reached the wire.** Request models encode loosely too, so an extra or misspelled
  optional member is carried into the body rather than rejected. Only an assertion on the captured
  `body` catches it.
- **A body that cannot encode never reaches your fake.** Encoding happens *before* the request is
  dispatched, so the call rejects with `EncodeError` and `stub.calls` stays **empty**. Same for a path
  parameter left `undefined` — its schema rejects it, also as an `EncodeError`, before anything is
  sent. Assert `stub.calls` is empty in those tests.
- **`retry.timeout` never rides the request.** It is a per-attempt budget in **milliseconds**, set on
  the client or on one call through `RequestOptions.retry`, and it reaches the wire only as the
  `Request`'s `signal`. A test asserting a timeout on a captured request is asserting something that
  was never there.

## Cover the failures that are not an `ApiError`

Every other failure rejects with another member of the `{Api}Error` family — narrowed on its closed
`kind` — and **never** matches an `ApiError` check (**typescript-error-handling**). Each `kind` is
reachable from the fake, which makes these paths genuinely testable rather than hypothetical:

| To produce | Make the fake `fetch` / the client |
| --- | --- |
| `kind: "connection"` | throw any error |
| `kind: "timeout"` | hang until aborted, with a tiny `retry.timeout` on the client |
| `kind: "decode"` | return a body that violates the schema (wrong type, bad date, a non-empty `200` where `undefined` is expected) |
| `kind: "encode"` | pass a request value its schema refuses — nothing reaches the fake |
| `kind: "auth"` | answer the **token** request with an error status (see below) |

A caller abort is **not** a `kind`: aborting the signal you passed in `RequestOptions` rejects with that
signal's own `reason`, outside the family.

```ts
import { {Api}Error } from "{package-name}";

it("maps a transport failure", async () => {
  const client = new {Api}Client({
    fetch: async () => { throw new Error("ECONNREFUSED"); },
    retry: { maxRetries: 0 },          // a connection failure is retried otherwise
  });

  try {
    await client.{resource}.{operation}({ /* ... */ });
    throw new Error("expected a rejection");
  } catch (err) {
    expect(err).toBeInstanceOf({Api}Error);
    expect((err as {Api}Error).kind).toBe("connection");
  }
});
```

⚠ **A timeout or abort test needs a fake that honours the `Request`'s `signal`.** The SDK aborts the
signal it put on the `Request` and relies on `fetch` to settle; a fake that returns a never-resolving
promise and ignores the signal simply hangs the test until the runner kills it. What the fake rejects
with does not matter — the SDK reads the reason off its own signal — so a timeout is a `TimeoutError`
the retry loop retries, which is why the test below sets `maxRetries: 0`.

```ts
const hangingFetch: typeof globalThis.fetch = (input, init) =>
  new Promise((_resolve, reject) => {
    const { signal } = new Request(input, init);
    signal.addEventListener("abort", () => reject(signal.reason), { once: true });
  });

it("times out", async () => {
  const client = new {Api}Client({ retry: { timeout: 10, maxRetries: 0 }, fetch: hangingFetch });

  await expect(client.{resource}.{operation}({ /* ... */ }))
    .rejects.toMatchObject({ kind: "timeout" });
});
```

That is faster and more deterministic than fake timers, and it exercises the real abort path. For a
caller abort, keep the default timeout, abort your own `AbortController` passed in `RequestOptions`, and
assert the call rejects with exactly the `reason` you passed — it is not an `{Api}Error`, and it is
never retried.

**A decode failure bypasses *both* response modes.** A 2xx body that does not satisfy the schema
rejects with `DecodeError`; `.asApiResult()` does **not** turn it into an `ok: false` result. Test that your
boundary maps it:

```ts
it("does not report an unreadable success body as a failure", async () => {
  // A real decode failure needs a TYPE mismatch, not an absent optional member.
  const { client } = clientReturning(jsonResponse(200, { id: 42 }));      // schema says string
  await expect(service.{operation}()).rejects.toBeInstanceOf(MyProviderUnreadable);
});
```

**A truncated 2xx that decodes cleanly** is the mirror image. A member declared optional is absent
without complaint and reads back `undefined`, so only your own guard catches it — test the guard:

```ts
it("does not report a truncated success body as a success", async () => {
  const { client } = clientReturning(jsonResponse(200, {}));              // no {wire_field}
  await expect(service.{operation}()).rejects.toBeInstanceOf(MyProviderUnreadable);
});
```

And the one people forget: **bad credentials**. A failed token fetch raises `AuthError` — `kind:
"auth"`, *not* an `ApiError` — carrying the token endpoint's `ApiError` on `.cause`. Return an
RFC 6749 error body from the **token** request and assert your configuration error, not a rejection
error:

```ts
it("treats bad credentials as a config error", async () => {
  const { client } = clientReturning(jsonResponse(401, { error: "invalid_client" }));  // no tokenResponse()
  await expect(service.{operation}()).rejects.toBeInstanceOf(MyProviderConfigError);
});
```

Being *refused* by the API is the other case: that is an `ApiError` with status 401/403 from the
operation itself.

## Fake an OAuth token endpoint

An OAuth 2 client fetches its token **lazily, on the first authenticated call, through the same
`fetch`** — so the *first* request your stub sees is the `POST` to the token endpoint, not your
operation. Two ways to handle it.

Queue a token response ahead of the operation's, and index from the end:

```ts
function tokenResponse(): Response {
  return jsonResponse(200, { access_token: "T", token_type: "Bearer", expires_in: 3600 });
}

const { client, stub } = clientReturning(tokenResponse(), jsonResponse(201, { id: "1" }));
await client.{resource}.{operation}({ /* ... */ });

expect(stub.calls).toHaveLength(2);
const { request } = stub.last();                                // index from the end, not calls[0]
expect(request.headers.get("authorization")).toBe("Bearer T");
```

Or route on the path, when the order is what you are testing:

```ts
const stub = stubFetch((url) =>
  url.pathname.endsWith("/{token-path}") ? tokenResponse() : jsonResponse(200, { id: "1" }),
);
```

Or bypass acquisition entirely with a stub token strategy — the generator's supported injection point
(**typescript-authentication**) — so the fake only ever sees your operation:

```ts
const stubStrategy = {                     // keep it a variable: inline, tryRefreshToken is a type error on the other grants
  getToken: async () => ({ accessToken: "T", tokenType: "Bearer" }),
  tryRefreshToken: async () => null,       // the authorization-code grant requires it
};

const client = new {Api}Client({
  {scheme}: { clientId: "id", clientSecret: "secret" },   // still required — the scheme is off without it
  {scheme}Strategy: stubStrategy,
  fetch: stub.fetch,
});
```

That credential fits the client-credentials grant. Match `{scheme}`'s type in `src/client-options.ts`:
`OAuth2PasswordCredentials` needs `username` and `password`, and `OAuth2AuthorizationCodeCredentials`
needs `redirectUri` and `promptForAuthorizationCode` (e.g. `async () => "code"`).

Facts that make these tests behave:

- **Forgetting the token request is the most common way a first test fails confusingly.** A
  single-response fake hands your operation's body to the *token* decoder, and you get an `AuthError`
  whose `cause` is a `DecodeError` about a missing `access_token` — which reads like wrong credentials
  when the fake simply answered the wrong request.
- The token **response** is wire-shaped (`access_token`, `token_type`, `expires_in`); the token
  **request** is a `POST` with a form-urlencoded string body, and by default the client id and secret
  ride in a Basic `Authorization` header rather than in that body.
- The token endpoint may live on a **different server group**, so match on the path, not the host —
  read the group's URL from `DEFAULT_SERVER_OPTIONS` in `src/servers.ts`.
- The token is **cached on the scheme**, so only the first call fetches one: a test making two calls
  against one client sees three requests, not four. Build a fresh client per test to reset it. A
  missing or non-positive `expires_in` means the cached token never expires.
- The token request and the operation each run on their own `retry.timeout`, so a tiny timeout in an
  OAuth test can fire on the token request — which ends the call with a `TimeoutError` for the token
  endpoint, not retried unless `httpMethodsToRetry` names `POST`.

## The alternative: intercepting global `fetch`

When your production code constructs the client itself and you cannot inject a `fetch`, intercept one
layer down instead — undici's `MockAgent` with `setGlobalDispatcher`, or `msw`. Your production code
runs unmodified:

```ts
import { MockAgent, setGlobalDispatcher } from "undici";

const agent = new MockAgent();
setGlobalDispatcher(agent);
agent.get("{base-origin}").intercept({ path: "{operation-path}", method: "POST" })
  .reply(201, { id: "1" }, { headers: { "content-type": "application/json" } });
```

Pick one and be consistent. An interceptor asserts on real URLs and is closer to the wire; the fake
`fetch` is dependency-free, faster, and does not care what HTTP stack is underneath. Two constraints:
an interceptor works **only while no `fetch` option is supplied** — a custom `fetch` bypasses it
entirely — and the client resolves `globalThis.fetch` **in its constructor**, so patching the global
after the client is built has no effect.

## Keeping tests independent of SDK internals

- **Never deep-import.** The package's `exports` map exposes `.` and `./package.json` and nothing else,
  so `{package-name}/models/…` does not resolve at all. Everything you need — the client, the options,
  every model type and its `{model}Schema`, the error classes, `ServerEnvironment` — is re-exported
  from the package root. Reading a file under `src/` is for *learning* the shape, never for importing.
- **Never assert on an error's `message`.** An `ApiError`'s is the call and its status —
  `POST https://… failed with 400` — which moves whenever the base URL or the route does. It is not a
  contract. Assert `err.status` and the narrowed `err.payload`.
- **Never derive test data from the schema's own definition** — reading `_keysMap` to generate a
  payload means the fixture cannot detect a wrong payload. Construct models explicitly and
  `{model}Schema.encode` them.
- **Test your own boundary's output, not the SDK's.** The valuable assertions are that a provider 4xx
  becomes your 4xx and a transport failure becomes your 5xx. That the SDK rejects with
  `{Operation}Error` on a 400 is the SDK's own tested behaviour, not yours.
- Prefer this `fetch`-seam approach over wrapping the SDK in your own interface unless you need to
  abstract the SDK for other reasons.

## Integration tests

Against a **local test server**, leave `fetch` alone and redirect the base URL:

```ts
const client = new {Api}Client({
  serverEnvironment: ServerEnvironment.{Environment},
  serverOptions: { default: { {environment}: { baseUrl: server.url } } },
});
```

**Override every group the test touches.** Redirecting `default` does not move a token endpoint that
lives on its own group — it will reach for the real host and the test will either fail slowly or,
worse, succeed against production. `src/servers.ts` lists the groups and their environments.

Against a **live sandbox**, keep those tests separate from unit tests, skip them when credentials are
absent, and never assert on ids or timestamps the provider generates:

```ts
const hasCredentials = Boolean(process.env.{API}_CLIENT_ID);

describe.skipIf(!hasCredentials)("integration", () => {
  it("{operation}", async () => {
    const client = new {Api}Client({
      serverEnvironment: ServerEnvironment.{SandboxEnvironment},   // state it, never rely on the default
      {scheme}: { /* from env */ },
      retry: { timeout: 15_000 },                                   // per attempt; retries stay on
    });
    const result = await client.{resource}.{operation}({ /* ... */ });
    expect(result.{member}).toBeDefined();
  });
});
```

Expect flakiness from the provider, not from your code, and never gate CI on a third party's uptime
unless you mean to.

## Notes

- **The response's `content-type` picks no decoder.** The decoder is fixed by the operation, so a stubbed
  `Response` needs no `content-type` header; setting one is harmless documentation. What matters is
  that the body parses and satisfies the schema. A binary response is the exception: its result
  reports `content-type` and the `content-disposition` file name, so stub them when your code reads them.
- **Matcher precedence:** an exact-status arm wins over a range or `"5XX"` wildcard arm. A test that
  stubs a status covered by both is asserting the exact one.
- **A `401` invalidates the cached OAuth token and is not retried by default.** A test that stubs a
  `401` sees one failed operation — and the *next* call in the same test re-fetches a token, so queue
  another `tokenResponse()` for it.
- **Retries are on by default, and silent unless logging is on.** On a client built without
  `retry: { maxRetries: 0 }`, a stubbed `408`, `429`, `500`, `502`, `503` or `504` — or a thrown
  error — on a `GET`, `HEAD`,
  `PUT` or `OPTIONS` call is fetched up to four times, across about 7 s of backoff. A queue that runs out
  throws, and that throw is itself a connection failure the loop retries. When the test *is* about
  your retry policy, queue one response per attempt, pass `delay: 0` so it runs at once, and count
  requests:
  ```ts
  const stub = stubFetch(queue(jsonResponse(503, {}), jsonResponse(503, {}), jsonResponse(200, { id: "1" })));
  const client = new {Api}Client({ fetch: stub.fetch, retry: { delay: 0 } });

  await client.{resource}.{operation}({ /* ... */ });   // an operation whose method is in the gate
  expect(stub.calls).toHaveLength(3);
  ```
  A stubbed `Retry-After` header overrides `delay`, so leave it off unless the test is about it; a test
  about the backoff itself wants `maxJitter: 0` and fake timers. Cover the cases that are easiest to get
  wrong: a write outside the gate is sent **once**, a widened write re-sends the **same**
  `Idempotency-Key` on every attempt, and an aborted request stops retrying.
- **A test environment with no global `fetch` fails in the constructor**, not on the first call — the
  client throws `ConfigurationError` when it can resolve no implementation. Passing a fake avoids this entirely.
- **`instanceof` is dialect-scoped.** If the test setup loads the SDK through `require` and the code
  under test through `import` (or vice versa), `instanceof` is `false` across that boundary. Narrow on
  `err.kind` / `err.payload.kind` there, or fix the config to use one dialect.
- **Never guess a base URL.** With a fake `fetch` nothing is dialled and the host is irrelevant; if you
  match on URLs, take the prefix from `DEFAULT_SERVER_OPTIONS` rather than from memory — environments
  differ per API, and some SDKs ship a sandbox environment that already points at localhost.
- Mocking libraries work too — the seam is a plain function, so a `vi.fn()` / `jest.fn()` returning a
  `Response` satisfies it. The hand-written stub above gives you typed captured requests and ordered
  responses for free.
- **Keep one client across the calls of a test** as in production, so the token cache and the memoized
  resource getters behave the same shape they will at runtime
  (**typescript-client-initialization**).
- To look up an operation's signature, its field channels, route or error arms, take them from the
  contract sheet — `map/operations/{resource}.md` inside `node_modules/{package-name}/`, which carries
  all four — not the compiled `dist/`, and not memory.



<!-- Source: .agents/skills/typescript-models/reference.md; MIT -->

# Models reference (APIMatic TypeScript)

Condensed reference for the shapes in **typescript-models**. The schema combinators live in
`src/core/validation/` — vendored static code, identical in every generated TypeScript SDK — and are
reached through the `s` namespace inside generated model modules. `s` re-exports `zod/v4-mini`
(`string`, `number`, `boolean`, `array`, `record`, `union`, `nullable`, `optional`, `literal`,
`unknown`) plus the SDK's own entries (`object`, `enumOf`, `discriminatedUnion`, `of`, `lazy`,
`optionalNullable`, `defaulted`, `dateTime`, `rfc1123DateTime`, `unixSecondsDateTime`, `dateOnly`, `bytes`).
Confirm concrete type and field names in `src/models/`.

## The two exports per model

```ts
import { type {Model}, {model}Schema } from "{package-name}";
```

One `type` and one schema value, both re-exported from the package root. Take the pair from an
operation's **Type sources** table (`Type` · `Schema value` · `Source`) in `map/operations/*.md`, or
from the **Models** section of `sdk-map.md`. The type-name-to-path transform is not reversible, so do
not guess the path.

**An enum is the exception to the `type` import.** Its name is a value *and* a type, so
`import { {Enum}, {enum}Schema }` — with `type`, `{Enum}.Active` does not compile. Every other model
type carries no runtime value, so under `verbatimModuleSyntax` it must be imported as
`import { type {Model} }` or `import type { {Model} }`; the schema const is always a value import.

The package ships `dist` (with declaration files), `src`, `README.md`, `api-reference.md`,
`sdk-map.md` and `map`, so the readable TypeScript and the contract sheets are all inside
`node_modules/{package-name}/`.

No property is emitted `readonly` and no model is frozen: a decoded response is a plain mutable
object, and mutating it changes nothing on the wire by itself.

## Spec kind to TypeScript type

| API definition kind | Model type | Schema entry |
| --- | --- | --- |
| string, password, regex-constrained, email, uri, ip, hostname, json-pointer, uuid | `string` | `s.string()` — **format unchecked** |
| `time` | `string` | `s.string()` — unchecked |
| `date` | `string` | `s.dateOnly()` |
| `date-time` (ISO 8601 / RFC 1123 / unix) | `Date` | `s.dateTime()` / `s.rfc1123DateTime()` / `s.unixSecondsDateTime()` |
| int32, int64 | `number` | `s.int()` |
| float, double, big-decimal | `number` | `s.float64()` |
| boolean | `boolean` | `s.boolean()` |
| binary, file — as a declared <em>field</em> | `Uint8Array` | `s.bytes()` (base64) |
| a value the spec fixed | that literal type | `s.literal(value)` |
| free-form object | `Record<string, unknown>` | `s.record(s.string(), s.unknown())` |
| array of `T` | `T[]` | `s.array(...)` |
| map of `T` | `Record<string, T>` | `s.record(s.string(), ...)` |
| model / enum reference | the referenced type | `s.lazy(...)`, or the bare schema const |
| unconstrained / no schema | `unknown` | `s.unknown()` — rejects nothing |

Nullability folds onto whatever the row produced: `T | null` with `s.nullable(...)`. It is never
folded onto `unknown`, which already admits `null`.

## Field declaration cheat sheet

| Declared | Schema entry | Building it |
| --- | --- | --- |
| `f: T` | the entry itself | always provide |
| `f?: T` | `s.optional(...)` | **omit the key** (not `f: undefined`) |
| `f?: T` | `s.defaulted(...)` | omitting it sends the spec default; set the value you mean |
| `f: T \| null` | `s.nullable(...)` | provide `null` to send JSON `null` |
| `f?: T \| null` | `s.optionalNullable(...)` | omit, or provide `null` |

```ts
// Conditional optional field, exactOptionalPropertyTypes-safe:
const body: {Model} = { id, ...(note !== undefined ? { note } : {}) };
```

Run time is more forgiving than the type system — an explicit `undefined` is dropped from the JSON, except where a spec default is sent instead —
but do not rely on it: the SDK's own tsconfig sets `exactOptionalPropertyTypes` (and
`verbatimModuleSyntax`, `noUncheckedIndexedAccess`, `strict`), and a consumer that does the same will
not compile.

`s.defaulted(entry, value)` marks a model property or a request field with a spec default; the SDK fills
the default on encode and decode.

## Deriving a changed copy

```ts
const updated = { ...model, {field}: "..." };
```

Nothing validates a spread — the schema runs when you pass the value to an operation or call `encode`
yourself, and that is where a bad value surfaces. The copy is **shallow**: nested models and arrays
are shared with the original, so mutating one mutates both. Undeclared keys the source carried are
copied along, which is what keeps a read-modify-write round-trip from dropping server-side state the
SDK does not model.

## Reading a response model

- **An absent optional is `undefined`**, unless it has a spec default. No sentinel, no wrapper, so `?.` / `??` are enough, and,
  without a default, `!== undefined` is the precise test where "absent" and "present but empty" differ.
- **A response type whose spec marks nothing required accepts `{}`.** `{model}Schema.decode({})`
  succeeds and every property is `undefined` or its default; a truncated body raises nothing. Check the properties
  you depend on.
- **Required on the request, optional on the response is normal.** Two schemas, one concept — read
  each from its own place in the map rather than assuming they match.
- Under `noUncheckedIndexedAccess`, `items[0]` is `T | undefined`; guard it before reaching through.
- An undeclared key that arrived on the wire is on the object but not in the type — reach it with a
  widening cast, and only when you must.

## Schema surface

```ts
type Schema<T, W = Encoded<T>> = {
  readonly decode: (value: unknown) => T;   // wire shape  -> model
  readonly encode: (value: unknown) => W;   // model shape -> wire
};

type EnumSchema<T> = Schema<T, T> & { readonly values: readonly T[] };
```

`Schema`, `EnumSchema` and `Encoded` are re-exported from the package root as types.

`Encoded<T>` — the wire projection:

| `T` | `Encoded<T>` |
| --- | --- |
| `Date` | `string \| number` |
| `Uint8Array` | `string` (base64) |
| `E[]` | `Encoded<E>[]` |
| object | each property projected |
| anything else | itself |

Both directions throw `SchemaError` on mismatch and produce nothing partial. The message is prefixed
`Wire value could not be decoded.` or `Type could not be encoded for the wire.`, followed by
`path: expected X, received T` per issue — `T` the type that arrived, never the value (`<root>`
where there is no path). It keeps no copy of the offending value; `.cause` is the underlying zod error
with the structured issue list. Through an operation it arrives one level down, on the `cause` of a
`DecodeError` or an `EncodeError`. Request encoding runs before the HTTP call, so an encode failure
means **nothing was sent**.

## Key renaming

The `_keysMap` entry inside a generated `s.object<T>({ ... })` literal maps TypeScript property names
to wire keys, and is applied on decode and encode both. Only properties that moved appear:

```ts
export const {model}Schema = s.object<{Model}>({
  createdAt: s.dateTime(),
  isActive: s.optional(s.boolean()),
  _keysMap: { createdAt: "created_at", isActive: "is_active" },
});
```

You never write wire keys. Reach for `_keysMap` — or the **Wire-name divergences** table in
`sdk-map.md` — only when reading a captured HTTP body.

## Enums

```ts
export const {Enum} = { Active: "active", Retired: "retired" } as const;
export type {Enum} = (typeof {Enum})[keyof typeof {Enum}] | (string & {});
export const {enum}Schema = s.enumOf<{Enum}>({Enum});
```

| Property | Behaviour |
| --- | --- |
| Type | **open** — the `(string & {})` / `(number & {})` tail admits any value of the base type |
| Wire value | the member's value, verbatim (`"active"`, or `1` for a number enum) |
| Decoding | checks the **base type only** — `s.enumOf` builds a string or a number check from the members and validates nothing else, so an unknown member is accepted |
| Known set | `{enum}Schema.values` — `readonly {Enum}[]`, in declaration order |
| Member names | generated identifiers; a number enum's members are `_0`, `_1`, … |

```ts
import { {Enum}, {enum}Schema } from "{package-name}";

body.status = {Enum}.Active;                             // preferred
body.status = "active";                                  // compiles, but survives a rename
const known = {enum}Schema.values.includes(fromServer);  // runtime membership test
```

Because unknown members decode, a `switch` over a received enum value **needs a `default` arm**, and
an `if`/`else if` chain over the members with no final `else` silently does nothing for a value newer
than the SDK.

There is **no coercion helper** — no `fromValue`, no closed lookup that raises — because a member *is*
its wire value:

```ts
{Enum}.Active === "active";              // true
`${{Enum}.Active}`;                      // "active" — safe in a log line, a URL, a query string
type Known = (typeof {Enum})[keyof typeof {Enum}];   // the closed set, at type level
```

Mapping an SDK enum onto your own, tolerating the open arm:

```ts
function toDomain(value: {Enum}): MyEnum {
  switch (value) {
    case {Enum}.Active: return MyEnum.A;
    case {Enum}.Retired: return MyEnum.B;
    default: return MyEnum.Unknown;      // covers values newer than this SDK
  }
}
```

## Discriminated unions (`oneOf`, and a polymorphic base)

```ts
// src/models/unions/{union}.ts
export type {Union} = ({ArmA} & { {tag}: "a" }) | ({ArmB} & { {tag}: "b" });

export const {union}Schema = s.discriminatedUnion<{Union}>("{wire_tag}", {
  a: {armA}Schema,
  b: {armB}Schema,
});
```

- The arms are the variant types **intersected with the tag literal**; the variant type itself does
  not declare the tag, so a value typed `{ArmA}` is not assignable to `{Union}`.
- **Narrow with `switch` on the tag.** The arms are exhaustive, so no fallback arm is needed.
- **Build by writing the arm's literal, tag included** — the schema writes the tag onto the wire from
  the value you pass, and dispatches on it when decoding.
- The schema's key is the **wire** discriminator and each entry's key is the wire tag **value**. The
  tag name on the **decoded** object can differ, where a variant renamed the discriminator; the type
  alias spells what arrives.
- A polymorphic base (an object schema that `allOf` subtypes with a discriminator derive from) is
  emitted here **as a discriminated union**, not as a base type. There is nothing to upcast to.
- ⚠ A tag matching no arm is a decode failure — a `SchemaError`, on a `DecodeError`'s `cause` through
  an operation — not an unset variant.

```ts
switch (value.{tag}) {
  case "a": return handleA(value);   // narrowed to the {ArmA} arm
  case "b": return handleB(value);
}
```

## Undiscriminated unions (`anyOf`)

```ts
export type {Union} = string | {Model};
export const {union}Schema = s.of<{Union}>(s.union([s.string(), s.lazy(() => {model}Schema)]));
```

- Nothing narrows the arms — use `typeof`, `in`, or `Array.isArray`.
- Decoding accepts a value matching **any** arm, and **the first match in declaration order wins**,
  so overlapping arms resolve by order.
- Build by passing a value of any arm directly. There is no wrapper and no factory.
- A union the spec left unconstrained degrades to `unknown`.
- ⚠ A value matching no arm is a decode failure — a `SchemaError`, on a `DecodeError`'s `cause`
  through an operation.

## Dates

| Schema | Model type | Wire | Notes |
| --- | --- | --- | --- |
| `s.dateTime()` | `Date` | `"2024-06-17T15:30:00Z"` | ISO 8601, **offset required**; encodes via `toISOString()` |
| `s.rfc1123DateTime()` | `Date` | `"Mon, 17 Jun 2024 15:30:00 GMT"` | strict IMF-fixdate (two-digit day, `GMT`); encodes via `toUTCString()` |
| `s.unixSecondsDateTime()` | `Date` | `1718638200` | epoch **seconds**; a numeric string also decodes; encodes floored to whole seconds |
| `s.dateOnly()` | `string` | `"2024-06-17"` | a **string**, not a `Date`; the `YYYY-MM-DD` shape is checked |

```ts
body.createdAt = new Date("2024-06-17T15:30:00Z");   // Date-typed fields
body.birthDate = "1990-04-02";                       // dateOnly field — a string
```

Failures to expect:

- `"2024-06-17"` into an `s.dateTime()` field → `SchemaError` (date-only, no offset).
- `"2024-06-17T15:30:00"` into an `s.dateTime()` field → `SchemaError` (no offset).
- `"Mon, 7 Jun 2024 15:30:00 GMT"` into `s.rfc1123DateTime()` → `SchemaError` (day must be two
  digits).
- Epoch **milliseconds** into `s.unixSecondsDateTime()` → no error; it decodes to a date ~50,000
  years out. Divide by 1000, or pass a `Date`.

Read the field's combinator in `src/models/{model}.ts` to know which applies — the `Date` type alone
does not say.

## Bytes

```ts
// Field declared: payload: Uint8Array   (schema: s.bytes())
body.payload = new TextEncoder().encode("hello");        // encoded to base64 on the wire
const text = new TextDecoder().decode(model.payload);    // decoded from base64 for you
```

Base64-in-JSON fields only. Non-base64 input fails on decode. This is not the file-upload carrier:
a raw-binary body and a multipart file part both take a `FileInput`, which is framed rather than
encoded, and a decoded `Uint8Array` is deliberately not assignable to one.

## Collections

| Field | Type | Pass |
| --- | --- | --- |
| array | `T[]` | a plain array |
| map / free-form object | `Record<string, T>` | a plain object |
| unconstrained value | `unknown` | anything; nothing is checked |

| Value | On the wire |
| --- | --- |
| omitted / `undefined` | key absent, or the spec default if it has one |
| `null` on a nullable field | `null` |
| `[]` | `[]` |
| `{}` | `{}` |

## Recursive and self-referential models

Generated schemas wrap a reference that nests inside another validator in `s.lazy(() => otherSchema)`,
so a model that refers to itself (a tree node, a nested comment) works with no special handling.
Nothing is required of you; the type is just a normal recursive `type`.

## Undeclared keys (passthrough)

Model schemas are built on a **loose** object, so undeclared keys survive both directions:

```ts
// Decoding: an undeclared response key is on the object but not in the type.
const extra = (model as Record<string, unknown>)["x_experimental"];

// Encoding: extra keys on a value you pass are sent.
// (Excess-property checking catches this on a fresh literal, not on a variable.)
```

There is no typed `additionalProperties` bag, and `additionalProperties: false` is not enforced — it
has no visible effect at all. A key you need but the type lacks means the spec does not describe it.

## What is never validated

`s.string()` carries no format check and no length or pattern check; `s.int()` and
`s.float64()` carry no `minimum`, `maximum` or `multipleOf` check; arrays carry no `uniqueItems` check.
The generator does not transcribe those
constraints, so there is nothing to read and nothing to invoke — they are enforced only by the
provider, as a `400`. `api-reference.md` carries the documented contract; put your own guard at your
own boundary if you want one before the round-trip.

## Round-tripping

```ts
const wire = {model}Schema.encode(model);          // wire-shaped plain object
const json = JSON.stringify(wire);
const back = {model}Schema.decode(JSON.parse(json));
```

`JSON.stringify(model)` directly is **not** the wire shape:

| Model value | Through `encode` | Through `JSON.stringify` directly |
| --- | --- | --- |
| a renamed property | the wire key | the TypeScript key |
| a `Date` on an RFC-1123 or unix-seconds field | that field's format | an ISO string — wrong format |
| a `Uint8Array` | base64 `string` | `{"0":104,"1":105}` — the bytes are gone |

So decoding a directly-stringified model fails on the renamed keys and the date formats, silently. The
same applies to handing a raw model to anything else that encodes — a framework's response
serializer, a cache, a queue: map it to your own type at the boundary, or hand out `encode`'s result.

Using a schema on inbound data you did not get from the SDK — a webhook body, a queue message, a
cached blob — is the intended use, and gives you the same validation the SDK applies to responses.



<!-- Source: SDK sdk-map.md; MIT -->

<!-- Generated file — do not edit; regenerated with the SDK. -->

# SDK map — Paypal (TypeScript)

> A generated table of contents for this SDK. Consult this map and its sub-pages to learn signatures, request-field placement, error types and server wiring **by lookup**. Model shapes and enum values are *not* duplicated here — the map names the file declaring each type and the schema value exported beside it; read the shape there. The compiler is the backstop: a wrong name fails to build.

|  |  |
| --- | --- |
| SDK display name | Paypal |
| Package | `paypal` |
| Package version | `2.29.0` |
| API spec version | `2.29` |
| Import specifier | `paypal` — the package root is the **only** entry. Deep imports (`paypal/models/...`) do not resolve; the `exports` map exposes `.` and `./package.json` and nothing else |
| Module format | dual ESM + CommonJS, as folder dialects (`dist/esm`, `dist/commonjs`), each with its own `package.json` marker. No `.mjs`, `.cjs`, `.d.mts` or `.d.cts` files exist |
| Node floor | `>=20.3` (`engines.node`) |
| TypeScript floor | a resolver that reads `exports` (4.7+), plus whatever the pinned `zod` requires — `zod@4` needs 5.5 or later. The public `.d.ts` chain reaches `zod/v4-mini`, so this is a real constraint rather than a build-tool version |
| Runtime dependency | `zod` (`^4.1.0`), imported as `zod/v4-mini`. The only runtime dependency |
| Generator | APIMatic |

Staleness check: the API spec version above changes when the SDK is regenerated from a new spec. If a lookup here fails to compile, trust the compiler and re-read the source file named in the row.

All `Source` paths on this map and its sub-pages are relative to the **SDK root** — the directory holding this file and `package.json` — never to the page that carries them: a page two directories deep writes exactly what a page at the root would. The package ships its `src/` tree, so the same paths resolve inside `node_modules/paypal/` too. An import specifier ending `.js` inside that source is the NodeNext spelling of the sibling `.ts` file.

---

## Getting a client

```ts
import { PaypalClient } from "paypal";

const client = new PaypalClient({
  oauth2: { clientId: "YOUR_CLIENT_ID", clientSecret: "YOUR_CLIENT_SECRET" },
});
```

The only constructor is `new PaypalClient(options: ClientOptions = {})`, so `new PaypalClient()` is the minimum. Resources are memoized lazy getters on the client — `client.orders`, `client.payments`, `client.vault`, `client.transactionSearch`, `client.subscriptions` — and their classes are exported only for their merged namespaces and for `instanceof`; their constructors take engine internals that are not exported, so reach a resource only through its getter.

All `ClientOptions` fields (source: `src/client-options.ts`; every field is `readonly`):

| Field | Type | Default |
| --- | --- | --- |
| `serverOptions` | the server's base-URL and template-variable overrides | `{}` — the resolver merges the declared defaults in |
| `retry` | `RetryOptions` | the `RetryOptions` defaults below |
| `logging` | `LoggingOptions` | off — the `LoggingOptions` defaults below |
| `fetch` | `FetchLike \| undefined` | the global `fetch`, resolved by the transport |
| `oauth2` | `OAuth2ClientCredentials \| undefined` | unset |
| `oauth2Strategy` | `OAuth2TokenStrategy<OAuth2ClientCredentials> \| undefined` | the built-in grant |

The 2 auth fields are all optional, and an unset one is not an error — the operation that wanted it simply sends no credential. What each one puts on the wire, and which operations require it, are under Servers & auth.

When no `fetch` is reachable the **constructor** throws `ConfigurationError`, not the first call.

`RetryOptions` fields (source: `src/core/retry.ts`; exported from `paypal` as a type). Every field is optional, so pass only the fields you change — each one left out takes its default:

| Field | Type | Default |
| --- | --- | --- |
| `timeout` | `number` (ms) | `60_000` |
| `statusCodesToRetry` | `readonly number[]` | `[408, 429, 500, 502, 503, 504]` |
| `httpMethodsToRetry` | `readonly HttpMethod[]` | `["GET", "HEAD", "PUT", "OPTIONS"]` |
| `maxRetries` | `number` | `3` |
| `delay` | `number` (ms) | `1000` |
| `backoffFactor` | `number` | `2` |
| `useExponentialBackoff` | `boolean` | `true` |
| `maxJitter` | `number` (a fraction, `0` to `1`) | `0.25` |
| `onRetry` | `((attempt: RetryAttempt) => void) \| undefined` | unset |

`retry: { maxRetries: 0 }` turns retries off.

A call may override three of these through `RequestOptions.retry`, typed `RequestRetryOptions`: `maxRetries`, `timeout` and `statusCodesToRetry`.

Retry types named by the fields above — public members with their **declared types**, verbatim from source; every member is `readonly`, and both are exported as types:

| Type | Public members | Source |
| --- | --- | --- |
| `RetryAttempt` — the `onRetry` callback argument | `attemptNumber: number` · `delay: number` · `reason: RetryReason` | `src/core/retry.ts` |
| `RetryReason` — narrow on `kind` | `{ kind: "status"; status: number; headers: Headers }` or `{ kind: "fault"; error: ConnectionError \| TimeoutError }`, the two retryable leaves of `PaypalError` | `src/core/retry.ts` |

`LoggingOptions` fields (source: `src/core/logging.ts`; exported from `paypal` as a type). Every field is optional, so pass only the fields you change — each one left out takes its default:

| Field | Type | Default |
| --- | --- | --- |
| `logger` | `Logger` | `console` |
| `level` | `LogLevel` — `"off" \| "error" \| "warn" \| "info" \| "debug"` | `"off"`; `"debug"` when `logger` is set |
| `logRequestHeaders` | `boolean` | `false` |
| `logResponseHeaders` | `boolean` | `false` |
| `logRequestBody` | `boolean` | `false` |
| `bodySizeLimit` | `number` (bytes of UTF-8) | `32_768` |
| `loggableContentTypes` | `readonly string[]` | `["application/json", "application/x-www-form-urlencoded"]` |
| `redactedHeaders` | `readonly string[]` | `[]` |
| `unmaskHeaders` | `readonly string[]` | `[]` |
| `redactedKeys` | `readonly string[]` | `["sig", "signature", "access_token", "apikey", "api_key", "client_secret", "password", "refresh_token", "code", "assertion", "client_assertion"]` |
| `redactionPlaceholder` | `string` | `"***"` |

A call may override one of these through `RequestOptions.logging`, typed `RequestLoggingOptions`: `level`.

Logging types named by the fields above — their **declared types**, verbatim from source; both are exported as types:

| Type | Public members | Source |
| --- | --- | --- |
| `Logger` — the `logger` field | `error(message: string, details: LogDetails): void` · `warn(message: string, details: LogDetails): void` · `info(message: string, details: LogDetails): void` · `debug(message: string, details: LogDetails): void` | `src/core/logging.ts` |
| `LogDetails` — narrow on `event` | `HttpRequestDetails \| RequestHeadersDetails \| RequestBodyDetails \| HttpResponseDetails \| ResponseHeadersDetails \| HttpRetryingDetails \| HttpFailedDetails`, each exported as a type | `src/core/logging.ts` |

**`ClientOptions.fetch` is the one transport extension point** — there are no hooks, no middleware and no interceptors, so a proxy, a custom agent and extra headers all go here. The SDK calls a replacement with one argument, the `Request` of the attempt, and no `init`. A replacement **must forward that `Request`, or its `signal`,** to whatever actually performs the request. Drop the signal and both the per-call signal and `retry.timeout` go inert — the call neither aborts nor times out. To add a header, copy the `Request` with `new Request(request)` and set it on the copy's `headers`: passing `{ headers }` to the copy replaces every header the SDK set rather than adding to them. A replacement may reject with an error of its own when that signal aborts; the SDK reads the `reason` of the signal it built the `Request` with to tell the deadline's `TimeoutError` from an abort of `RequestOptions.signal`, so a timeout is still retried, and an abort still rejects with the caller's own `reason`.

**Cancellation.** The `signal` on `RequestOptions` is the per-request cancellation surface. Aborting rejects with the signal's **own `reason`** — whatever you passed to `abort()`, or the platform `DOMException` a bare `abort()` supplies — unwrapped, so it is **not** an `PaypalError` and a `catch` that tests the family must rethrow it. An already-aborted signal rejects immediately. The `retry.timeout` that bounded the attempt is the SDK's own and does stay in the family, as `err.kind === "timeout"`. It starts once the credential is in hand and covers the request up to its response headers — not obtaining the credential and not reading the body, which only the signal bounds, so a body that stalls after its headers holds a call with no signal until the transport gives up. A built-in OAuth2 token request is timed on its own, so a slow token endpoint ends the call with a `TimeoutError` whose `uri` is the token endpoint.

The entire per-request surface is the optional second argument of every operation:

| Type | Members | Source |
| --- | --- | --- |
| `RequestOptions` | `signal?: AbortSignal \| undefined` · `retry?: RequestRetryOptions` · `logging?: RequestLoggingOptions` | `src/core/api-request.ts` |
| `RequestRetryOptions` — `Pick<RetryOptions, "maxRetries" \| "timeout" \| "statusCodesToRetry">` | `maxRetries?: number` · `timeout?: number` · `statusCodesToRetry?: readonly number[]` | `src/core/retry.ts` |
| `RequestLoggingOptions` — `Pick<LoggingOptions, "level">` | `level?: LogLevel` | `src/core/logging.ts` |

**A per-call `retry` is merged field by field over the client's resolved policy**, so `{ retry: { maxRetries: 0 } }` changes that one field for that one call and leaves every other call alone.

**Not on this SDK.** These are absent by design, not undocumented. This table ships with `src/core/` and is versioned with it.

| You might reach for | Reality |
| --- | --- |
| hooks, middleware, interceptors, `onRequest`/`onResponse` | none. `fetch` is the one transport extension point |
| pagination, `for await`, auto-paging helpers | no operation is paginated and nothing is async-iterable |
| SSE, `text/event-stream` | no event streams. Every decoder reads the body to completion, bar a binary success, which hands its stream over unread |
| multipart <em>responses</em>, XML bodies | none. A multipart reply is not decoded and an XML body is not sent — an operation declaring either is still emitted, with no body to supply or read |
| per-request `headers`, `baseUrl`, idempotency key | none. `RequestOptions` is `{ signal, retry, logging }`; a header, a base URL and a caller-supplied idempotency key are not on it |
| the raw `fetch` `Response` | deliberately unreachable. `status` and `headers` are on `asApiResult()` and on a thrown `ResponseError` |

---

## Error-handling model (read once — applies to every operation)

Operations are **throw-based**, and every **operational** failure belongs to **one family**: `PaypalError`, a union over six leaves, so one `instanceof PaypalError` sees all of them. It is not the whole escape set — four throwables sit outside it, enumerated below. Every leaf names the call it raised — `err.method` and `err.uri` — and `message` opens with that name. `instanceof` is reliable **within one dialect**: a process that loads both — `import` in one file, `require` in another — gets two independent copies of every error class, and `instanceof` across that boundary is `false`. Narrow on `err.kind` there, or on `err.name`, which is stable across copies.

Core types (public members with their declared types; all are `readonly`):

| Type | Public members | Source |
| --- | --- | --- |
| `PaypalError` (declared as `CoreError`) | `kind: ErrorKind` · `method: HttpMethod` · `uri: string` · `message` · `cause` — the union every failure below belongs to | `src/core/errors.ts` |
| `ResponseError` | the rung the server answered on, `ApiError \| DecodeError`; adds `status: number` · `headers: Headers` | `src/core/errors.ts` |
| `ApiError` | `kind: "api"` · `payload` — the open arm, whose `kind` is `string`. **Not generic**: a typed operation's subclass redeclares `payload` with its own literal arms | `src/core/api-error.ts` |
| `TimeoutError` | `kind: "timeout"` · `timeout: number` | `src/core/errors.ts` |
| `DecodeError`, `EncodeError`, `ConnectionError`, `AuthError` | their `kind`, and nothing beyond the two rows above | `src/core/errors.ts` |
| `Declared<K, B>` | `kind: K` · `body: B` | `src/core/api-error.ts` |
| `ErrorPayload<P>` | `P` or `{ kind: "undeclared"; rawBody: ArrayBuffer }` | `src/core/api-error.ts` |
| `Undeclared` | `kind: "undeclared"` · `rawBody: ArrayBuffer` — the always-present arm, carrying the untouched bytes of a status the spec does not describe | `src/core/api-error.ts` |
| `ApiResult<T, E>` | on success `{ ok: true; status; headers; value: T }`, on failure `{ ok: false; status; headers; message: string; method: HttpMethod; uri: string; payload: ErrorPayload<P> }` — the failure branch carries the error's own members, never the error object | `src/core/api-promise.ts` |

`PaypalError` and `ResponseError` are each a **type and a value**: the type is the union, the value is the abstract class every leaf extends, so `instanceof` and `err.kind` select the same set. Neither can be constructed or extended. `uri` is the absolute URL the call dialled, with the server variables expanded and the path parameters filled. It carries no query, fragment or userinfo, so no query parameter reaches it. One failure names an unresolved URI: a path parameter rejected by its schema arrives as an `EncodeError` whose `uri` still shows the unfilled `{braces}` — an `undefined` one included, since a path parameter is always required, so its schema rejects it first. On an `AuthError` the pair names the **operation you called**, not the token endpoint, which appears after it in the message.

`ErrorKind` is closed, so a `switch` over `err.kind` is exhaustive:

| `err.kind` | What happened | Adds |
| --- | --- | --- |
| `"api"` | the API answered with an error status | `status` · `headers` · `payload` |
| `"decode"` | the answer could not be turned into the declared value — the body was not JSON, failed its schema, arrived where none is declared, or died mid-read after the response line; `cause` carries the underlying failure | `status` · `headers` |
| `"encode"` | a request value did not match its declared type, so **nothing was sent**. `cause` is the `SchemaError` that rejected it | — |
| `"connection"` | `fetch` rejected before a response line arrived | — |
| `"timeout"` | `ClientOptions.retry.timeout` elapsed. `timeout` is the budget that ran out | `timeout` |
| `"auth"` | a credential could not be **obtained**, per the paragraph below | — |

**Four throwables sit outside the family**, so `instanceof PaypalError` is `false` on each and a `catch` that tests it has to rethrow what is left. `ConfigurationError` comes out of the **`PaypalClient` constructor**, synchronously and before any `ApiPromise` exists: no reachable `fetch` or a `ClientOptions.retry` or `ClientOptions.logging` whose reads throw. One call can reject with it too: a `RequestOptions.retry` or `RequestOptions.logging` whose reads throw. Either way the failed read is on `cause`. `SchemaError` is what a codec throws when called directly — `avsCodeSchema.decode(json)` — so it names no call; through an operation the same failure arrives one level down, on `DecodeError.cause` or `EncodeError.cause`, and a `serverOptions` override whose value is not a string raises it from the constructor too. Bugs stay outside the family and reach you raw — an unparseable `baseUrl` is a `TypeError`. And a caller abort arrives as the signal's own `reason`, unwrapped. The first two are exported from the package root; the other two are not ours to export.

**`AuthError` is about obtaining a credential, never about being refused one** — a refused token endpoint. A 401 *from the API* is an `ApiError` like any other status. A 401 does have one auth consequence: it invalidates whatever that operation's scheme had cached, so the **next** call re-acquires.

```ts
try {
  const response = await client.orders.authorizeOrder({ id: "some example string" });
} catch (err) {
  if (err instanceof PaypalError) {
    switch (err.kind) {
      case "api":
        // TODO: the API answered with an error status — read err.status and err.payload
        break;
      case "decode":
        // TODO: the answer did not fit the spec — read err.status and err.cause
        break;
      case "encode":
        // TODO: nothing was sent — err.cause is the SchemaError that rejected the value
        break;
      case "connection":
      case "timeout":
      case "auth":
        // TODO: no response was produced — err.kind says which
        break;
    }
  } else {
    throw err;
  }
}
```

**Narrowing the payload.** A typed subclass declares its arms as literals, so `switch (err.payload.kind)` narrows `payload.body` to exactly one model. The `kind` is named after the arm's **body**, *not* its status code: a body that references a model takes that model's name in lower camel, any other body `error{Status}`, and a second arm that would land on the same name takes a numeric suffix. On the base `ApiError` — what an operation with no declared error bodies rejects with — `payload.kind` is `string`, so comparing it to `"undeclared"` narrows **nothing**: use `"rawBody" in err.payload`. Which arms an operation declares, with the status each covers, is the **Error arms** bullet on its page below.

**Matcher precedence** for a subclass with several arms, in three passes: an exact numeric status is looked up across the whole table **first**, then the first covering `[lo, hi]` range, and last a `"default"` arm where the spec declared one. A body that does not fit the arm it matched is a `DecodeError` — except on `"default"`, which describes no status in particular and so **degrades to the `"undeclared"` arm** rather than throwing.

**The non-throwing form exists on every operation.** `.asApiResult()` returns `ApiResult<T, E>` and does **not** reject for an HTTP error status — every other failure still rejects, `DecodeError` included, so the `catch` stays. It must be called on the value the operation returned: `ApiPromise` overrides `Symbol.species`, so `.then()`, `.catch()` and `.finally()` hand back a plain `Promise` and the method is gone.

```ts
try {
  const result = await client.orders.authorizeOrder({ id: "some example string" }).asApiResult();
  // TODO: Use 'result.status' and 'result.headers' to read the raw response status and headers
  if (result.ok) {
    // TODO: Use 'result.value' — what this operation resolves to
  } else {
    // TODO: Use 'result.message', 'result.method' and 'result.uri', and narrow 'result.payload'
  }
} catch (err) {
  if (err instanceof PaypalError) {
    // TODO: no error status was produced — err.kind says which failure this is
  } else {
    throw err;
  }
}
```

`result.payload` is the same `ErrorPayload<P>` a thrown `ApiError` carries on `err.payload`, and `result.message`, `result.method` and `result.uri` are that error's own members — so the **Error arms** bullet on an operation's page enumerates the payload either way, and the `catch` above it is for the rest of the family. `result.method` and `result.uri` are named on this map alone.

Of **40 operations**, **40** declare typed error bodies and **0** reject with the base `ApiError`, whose payload is always the `"undeclared"` arm.

---

## Operations — by resource (5 groups, 40 operations)

Each page below carries one block per operation, with bullets in the fixed order **Server**, **Signature**, **Wire**, **Auth**, **Request body**, **SDK-sent**, **Returns**, **Error**, **Error arms**, then a **Fields** table mapping every request field to the channel it travels on, and a **Type sources** table naming the declaring file and schema value of every type the operation mentions. With `api-reference.md` documenting operations only, that table is the route from an operation to the file declaring what it takes.

**Each block states what is specific to its operation. Everything in the table below holds for EVERY operation unless that operation says otherwise, so a block silent on one of these points is telling you the default here applies — take it and move on rather than opening the source to confirm it.**

| Applies to every operation | Stated where | A block departs from it only by |
| --- | --- | --- |
| **Call shape `op(request, options?)`** — one flat request object first, the per-call options second. There is no positional overload. What the second argument carries is a `signal`, a `retry` override and a log level; a per-call base URL, header or auth override does not exist | here, Getting a client | never — it always holds |
| **The request object is flat and channel-blind.** A field named `body` *is* the whole request body; every other field is fanned out to path, query, header or form by the SDK. Nothing in the object is nested by channel | here | never — the **Fields** table `Channel` column always resolves it |
| **Throw-based, returning `ApiPromise<T, E>`.** `await` it for `T`; call `.asApiResult()` on the returned value for the non-throwing `ApiResult<T, E>`. No operation is result-only | here, Error-handling model | never |
| **`E` is the base `ApiError`** and the payload is always the `"undeclared"` arm | Error-handling model | the spec declared error bodies — the **Error** bullet names a subclass and an **Error arms** bullet gives each arm's tag, status and body |
| **The request body and its media type are stated on every block**, by a **Request body** bullet that is never omitted. `none` means no body **and no `Content-Type` header**, and a named media type means the body is **required** — the request type's field is not optional | here | the spec declared the body optional — the bullet adds **Optional**, the field is `field?:`, and omitting it sends no body and no `Content-Type` header at all |
| **Resolves once, to one whole value** — except a binary body, which resolves to a stream the caller reads. No pagination, no SSE, no async iterables and no partial results | here, Not on this SDK | never at this SDK version |
| **Six identity headers ride every request** — `User-Agent`, `X-APIMatic-Lang`, `X-APIMatic-Package-Version`, `X-APIMatic-Gen-Version`, `X-APIMatic-OS` and `X-APIMatic-Runtime`. They identify the generated SDK, so **no option configures them** | here | the operation declared a header of the same name — the operation's layer is folded after the client's, so its value wins |
| **A fresh `Idempotency-Key` rides every non-GET call that does not declare that header itself**, minted per call in the operation's own header layer. It makes a *replayed* request safe, not a repeated one — a value that changes per call deduplicates nothing, so it is no substitute for a key the API documents. **No option sets it**, and once minted it is always sent — a runtime with no `crypto` global mints it from `Math.random` mixed with the clock and a per-process counter | here | the operation is a GET, or declared that header itself — then its own value stands and nothing is minted |
| **Server group `default`** | here, Servers & auth | the operation is on another group — its block carries a **Server** bullet |
| **Every operation states its auth requirement**, by an **Auth** bullet that is never omitted — one scheme, a composition over schemes, or `none` for a public operation | here, Servers & auth | never — the bullet is always present |
| **Every value is schema-encoded before the request is built** — a wrong type or format rejects and nothing is sent. **An omitted field that has a default is still sent, with that default**, filled by the SDK rather than by the server | here | the field has a default — it appears in the **Fields** table `Default` column |
| **Field names are TypeScript camelCase and the wire name is the same** | here | some field differs — the **Fields** table gains a `Wire` column, where an em dash means "same as the field name" |
| **Arrays repeat their key and objects bracket-expand** | the serialization block below | never — this SDK declares no per-field serialization style, so every array takes this one |

**Wire serialization, once, for every channel** (source: `src/core/param-value.ts`, `src/core/url.ts`, `src/core/headers.ts`, `src/core/params.ts`). This block ships with `src/core/` and is versioned with it:

- **`path`** takes no style. An array is comma-joined with each element percent-encoded **separately**; an object becomes one percent-encoded JSON document inside the segment. A field whose encoded value is `undefined` throws `TypeError` naming the unfilled placeholder — a guard no operation reaches, since a path parameter is always required and its schema rejects `undefined` first, as an `EncodeError`; `null` collapses the segment.
- **`header`** takes no style. An array is comma-joined un-encoded (OpenAPI `simple`). `undefined` says nothing, while `null` and an empty array are tombstones that remove the header. Later layers win by **lowercased** name, in the order body content type, then client defaults, then operation.
- **`query`** and **`form`** repeat an array's key and bracket-expand an object at any depth (`filter[status]=open`, `ranges[amount][min]=10`). An array of *objects* bracket-expands per element with **no index**, so element boundaries collapse.
- Nullish **fields** are dropped from every channel except `path`, where `null` collapses the segment. A nullish array **element** is dropped, so an all-nullish array emits no key at all.
- `form` bodies use RFC 1866 encoding (space becomes `+`); `query` uses `%20`. On the wire both key and value go through `encodeURIComponent`, plus a further escape of `!`, `'`, `(`, `)` and `*`.

**The verb and route are on the pages below**, where a map for a language whose method names are derived from the route can leave them to the source. A TypeScript method name carries none of it, and a `path` field row is unreadable without the route template it fills.

**Endpoint prose is not on this map.** Where the *semantics* of an operation decide what you must pass — a field whose value changes server-side behaviour, an ordering or exclusivity rule between fields — read `api-reference.md`, whose entries are keyed by the same signature these pages print. Blocks here give you the contract: names, channels, types, defaults, errors.

| Resource (`client.X`) | Ops | Page |
| --- | --- | --- |
| `orders` | 8 | [map/operations/orders.md](map/operations/orders.md) |
| `payments` | 7 | [map/operations/payments.md](map/operations/payments.md) |
| `vault` | 6 | [map/operations/vault.md](map/operations/vault.md) |
| `transactionSearch` | 2 | [map/operations/transaction-search.md](map/operations/transaction-search.md) |
| `subscriptions` | 17 | [map/operations/subscriptions.md](map/operations/subscriptions.md) |

---

## Models — where they live, how to build them

**Shapes live only in the source.** Every module under `src/models/` declares exactly one model type and the schema value beside it, and both are re-exported from the package root. Take the pair from an operation's **Type sources** table, or build the directory from the kind below. **Do not derive the path from the type name** — the transform is not reversible in general, and the table is the authority. Never grep for a type.

| Group | Count | Directory |
| --- | --- | --- |
| Objects (plain `type`, no class) | 284 | `src/models/` |
| Enums (open; const companion plus schema) | 87 | `src/models/` |
| Typed error classes (`ApiError` subclass, one per typed operation) | 40 | `src/resources/`, in the declaring module's namespace |

Conventions: every model is a plain `type`, not a class — build one with an object literal; there is no constructor and no builder. `f: T` is required, `f?: T` is optional (omit the key), and `f: T | null` is a **required, nullable** field where `null` is a value distinct from an omitted key. Optional properties are declared `f?: T`, not `f?: T | undefined`, so under `exactOptionalPropertyTypes` you must **omit or spread** an absent field rather than assign `undefined` to it. A schema value is directly usable both ways: `Schema<T, W = Encoded<T>>` is `{ decode(v: unknown): T; encode(v: unknown): W }`, and `Encoded<T>` is the wire projection — a `Date` becomes `string | number`, a `Uint8Array` becomes a base64 `string`, recursing through arrays and objects. `EnumSchema<T>` adds `readonly values: readonly T[]`, so an enum's known set is testable at run time. Enums are **not** TypeScript `enum`s and are open: a `const` companion plus a union that includes `(string & {})` or `(number & {})`, so **any** value of the base type is assignable and the schema validates the base type only, never membership — read the member names and the values they send off the companion, and use `.values` to test membership yourself. A discriminated union is narrowed with an exhaustive `switch` on its tag, with no fallback arm and no type guard to import; one without a discriminant is narrowed on the shape of its arms, which its declaration spells out. A property default is filled by the SDK on **encode as well as decode**, so omitting one still sends it — read it off the `defaulted(…)` entry in the schema, or off the property's `@default`. A numeric property is a `number` whatever its format, and its schema follows the type. `type: integer` with no format, `int32` or `int64` rejects a fraction and any value outside the safe-integer range; `type: number` with no format, `float`, `double` or `bigdecimal` rejects a non-finite value. A property's wire name is its `_keysMap` entry in the schema and may differ from the TypeScript name — read it there rather than deriving it. A named spec schema whose resolved form is a bare container, or which is used only as a form-encoded body, gets no model file and no exported name: the first is written inline at each use site, the second is flattened onto the operation's request type, one field per property, so read that field list from the request type.

Every name comes from the package root — there is no default export, and no deep imports:

```ts
import { type AvsCode, avsCodeSchema } from "paypal";
```

---

## Servers & auth

**Authentication is per operation.** Every operation declares the requirement it enforces and the SDK sends exactly that: **40 of the 40 operations** require a credential and **0** are public. Each block on a page above carries an **Auth** bullet naming its requirement, `none` included. There is no client-global switch and no per-call override.

| Scheme (as an **Auth** bullet names it) | Configured with | What the SDK sends |
| --- | --- | --- |
| `oauth2` | `oauth2: { clientId, clientSecret, scope? }` | `Authorization: Bearer <access token>` |

A scheme **contributes** headers, query parameters and cookies rather than mutating the request, so a credential is encoded by exactly the code that encodes an operation's own parameters. The auth layer goes on **last**, which means a scheme's `Authorization` wins over one the operation declared.

**Composition is emitted, not configured.** Where the spec puts two schemes in one requirement the SDK sends **both**; where it lists alternatives the SDK sends the **first configured** one, in the order the **Auth** bullet prints them. The combinators that express this (`allAuth`, `anyAuth`, `noneAuth`) live in the generated resource modules and are **not exported**.

**A credential may be a function.** Every field typed `TokenProvider` is re-read on **every** request with no caching, so a key can rotate without rebuilding the client. An empty string counts as absent, and a function is treated as present without being invoked. The function is handed the call's `signal`, or one that never aborts when the call was given none, and the SDK waits for it to settle — so a function that fetches its credential should pass that signal on, or a cancelled call waits for the fetch to finish.

**An unconfigured scheme does not throw.** The request goes out without that credential and the server decides. So a 401 on a call you believed was authenticated is usually an unset credential field rather than an SDK failure — check the operation's **Auth** bullet against what the client was given.

**OAuth2 fetches and caches its own token.** The token request goes through the same client as every other call — same `fetch`, same `retry` policy. It sends a form-urlencoded body, and **decodes** the response against a schema rather than casting it. An access token is cached until shortly before it expires; a response carrying no `expires_in` is treated as never expiring (RFC 6749 §5.1); concurrent callers share one in-flight fetch, and one of them aborting ends only its own wait — unless it is the caller that started the fetch, whose signal the fetch runs under. A refused token endpoint rejects with `AuthError` wrapping the underlying `ApiError` as `cause` — untyped, so its payload is the `"undeclared"` arm — so it never looks like the business call failing.

| Flow | Token endpoint | Client credentials travel |
| --- | --- | --- |
| `oauth2` | `default` + `/v1/oauth2/token` | as `Authorization: Basic` |

**Replacing a grant.** Each OAuth2 scheme's token request is a strategy you can substitute — `oauth2Strategy` on `ClientOptions`. A strategy is one method, `getToken(credentials, signal)`, plus `tryRefreshToken(...)` for the refreshable one. `signal` is the one the call was given, or one that never aborts when it was given none; nothing times a strategy of your own. Supply it and the built-in token request is not used, while the caching, the expiry buffer and the single-flight behaviour above still apply.

**The auth types you can name.** Every row below is exported from the package root. `Source` is where to read the declaration, never what to import — the credential shapes themselves are already spelled in the scheme table above.

| Type | Source |
| --- | --- |
| `OAuthToken` | `src/core/auth/oauth2-strategies.ts` |
| `OAuth2CredentialPlacement` | `src/core/auth/oauth2-strategies.ts` |

**A 401 invalidates the cached credential.** On a **401** — 401 only, not 403 — the SDK clears whatever that operation's scheme had cached, so the *next* call re-acquires. The current request still rejects with the operation's `ApiError`. The credential fields are on `ClientOptions`.

**serverOptions.** 1 logical server; each operation is bound to one at generation time, and a block carries a **Server** bullet only when its group is not `default`. Override `serverOptions`.

**Base URLs and overrides.** One row per group, and every cell is overridden at `serverOptions.<name>`, where `<name>` is `baseUrl` for the whole template or the variable name for one substitution. An override merges with the built-in defaults **key by key**.

| Group | Base URL template | Template variables (default) |
| --- | --- | --- |
| `default` | `https://api-m.sandbox.paypal.com` | — |

A `baseUrl` override replaces the template verbatim; variable values are percent-encoded into it. Server variables are filled in once, as the client is built; only the path parameters are expanded per request.

Retries are configurable via `ClientOptions.retry` (`RetryOptions`, source `src/core/retry.ts`) — the field table is under Getting a client.

---

## Runtime & packaging

The facts that change what you type, and the floors that decide whether the package loads at all. This section is the home for all of them.

|  |  |
| --- | --- |
| One entry, two dialects | `import` resolves `dist/esm`, `require` resolves `dist/commonjs`, both through the single `.` export. In a TypeScript CommonJS file the typed spelling is `import sdk = require("paypal")`; a plain `require` destructure works at run time but yields no types. `instanceof` is reliable **within** one dialect — if your app loads both, the two copies declare separate error classes |
| Consumer compiler settings | Under `exactOptionalPropertyTypes`, **omit or spread** an absent optional rather than assigning `undefined` to it. Under `verbatimModuleSyntax`, names that carry no runtime value (the options types, every model type) must be imported with `import type` |
| Required globals, and only these | Always: `fetch` (or a replacement passed as the `fetch` option), `AbortController`, `AbortSignal.any`, `Headers`, `Request`, `URL`, `setTimeout` and `clearTimeout`, `JSON`, `BigInt`, and `console`, which is read as the package loads. Auth adds more, each reached only once the credential needing it is configured. `TextEncoder` and `btoa` build every `Authorization: Basic` value, sent on every OAuth2 token request, whose client credentials travel as Basic by default. `crypto.randomUUID` or `crypto.getRandomValues` mints the `Idempotency-Key` a non-GET call carries — **read and never required**, since a runtime offering neither fills the bytes from `Math.random` mixed with the clock and a per-process counter, so the header is always sent. Three more are **read and never required** — `process`, `navigator` and `EdgeRuntime`, which name the host in `X-APIMatic-OS` and `X-APIMatic-Runtime`. A runtime offering none of them sends neither header and works unchanged. `process.env.PAYPAL_CLIENT_LOG` is read at most once, when the client is built and code sets neither a `logger` nor a valid `level`. Logging writes to `console` only as the default logger, and for the warning on a `PAYPAL_CLIENT_LOG` value that is not a level. |
| Values that cross the boundary | `Date` for `date-time`, `string` for `date`, `ArrayBuffer` for an undeclared error body, `Headers` on a result and on a thrown `ResponseError`. The engine also carries a `bigint` int64 path and a base64 `bytes()` codec, reached only where a model uses them |
| Browser distribution | The package ships `dist/esm` and `dist/commonjs` and nothing else — **no bundle, no UMD file, no CDN artifact**. Use it through a bundler, which resolves `zod/v4-mini`, deduplicates it against your own copy and tree-shakes the rest |
| Other runtimes | Deno, Bun, Cloudflare Workers and Vercel Edge are all likely to work — the SDK needs only the globals above and imports no Node built-in — but **none of them is tested for this package**, so nothing here claims support for them |

The browser floor is set by `AbortSignal.any`, which every call uses to combine `RequestOptions.signal`, or a signal that never aborts when there is none, with the attempt's timer. The emitted output needs less: `tshy` builds at `target: ES2022`, so native `#private` fields and methods survive into `dist/`, and those load from Chrome 85, Firefox 90 and Safari 15.

| Browser | Minimum |
| --- | --- |
| Chrome / Edge | **116** |
| Firefox | **124** |
| Safari / iOS Safari | **17.4** |

Below that table the module still loads, down to the emitted-output floor, but every call rejects with a `TypeError`.




<!-- Source: SDK map/operations/orders.md; selected complete operation blocks; MIT -->

### captureOrder

- **Signature**: `captureOrder(request: Orders.CaptureOrderRequest, options?: RequestOptions): ApiPromise<Order, Orders.CaptureOrderError>`
- **Wire**: `POST /v2/checkout/orders/{id}/capture`
- **Auth**: `oauth2`
- **Request body**: `application/json` — the `body` field. **Optional**: omit it and the request carries no body and no `Content-Type` header at all
- **SDK-sent**: `header Idempotency-Key` (minted per call)
- **Returns**: `Order`
- **Error**: `PaypalError` with `kind: "api"`, an instance of `Orders.CaptureOrderError` — **typed arms**, narrowed on `err.payload.kind`
- **Error arms**: `"error"` [400] `Error` · `"error2"` [401] `Error` · `"error3"` [403] `Error` · `"error4"` [404] `Error` · `"error5"` [422] `Error` · `"error6"` [500] `Error` · `"error7"` [default — any status no arm above covers] `Error` · `"undeclared"` [a `default`-matched body that did not fit `Error`] `rawBody: ArrayBuffer`

**Fields** — `Orders.CaptureOrderRequest` (7):

| Field | Channel | Wire | Type | Req | Default |
| --- | --- | --- | --- | --- | --- |
| `id` | `path` | — | `string` | yes | — |
| `payPalMockResponse` | `header` | `PayPal-Mock-Response` | `string` | no | — |
| `payPalRequestId` | `header` | `PayPal-Request-Id` | `string` | no | — |
| `prefer` | `header` | `Prefer` | `string` | no | `"return=minimal"` |
| `payPalClientMetadataId` | `header` | `PayPal-Client-Metadata-Id` | `string` | no | — |
| `payPalAuthAssertion` | `header` | `PayPal-Auth-Assertion` | `string` | no | — |
| `body` | `body` | — | `OrderCaptureRequest` | no | — |

| Type | Schema value | Source |
| --- | --- | --- |
| `OrderCaptureRequest` | `orderCaptureRequestSchema` | `src/models/order-capture-request.ts` |
| `Order` | `orderSchema` | `src/models/order.ts` |
| `Error` | `errorSchema` | `src/models/error.ts` |


### createOrder

- **Signature**: `createOrder(request: Orders.CreateOrderRequest, options?: RequestOptions): ApiPromise<Order, Orders.CreateOrderError>`
- **Wire**: `POST /v2/checkout/orders`
- **Auth**: `oauth2`
- **Request body**: `application/json` — the `body` field
- **SDK-sent**: `header Idempotency-Key` (minted per call)
- **Returns**: `Order`
- **Error**: `PaypalError` with `kind: "api"`, an instance of `Orders.CreateOrderError` — **typed arms**, narrowed on `err.payload.kind`
- **Error arms**: `"error"` [400] `Error` · `"error2"` [401] `Error` · `"error3"` [422] `Error` · `"error4"` [default — any status no arm above covers] `Error` · `"undeclared"` [a `default`-matched body that did not fit `Error`] `rawBody: ArrayBuffer`

**Fields** — `Orders.CreateOrderRequest` (7):

| Field | Channel | Wire | Type | Req | Default |
| --- | --- | --- | --- | --- | --- |
| `payPalMockResponse` | `header` | `PayPal-Mock-Response` | `string` | no | — |
| `payPalRequestId` | `header` | `PayPal-Request-Id` | `string` | no | — |
| `payPalPartnerAttributionId` | `header` | `PayPal-Partner-Attribution-Id` | `string` | no | — |
| `payPalClientMetadataId` | `header` | `PayPal-Client-Metadata-Id` | `string` | no | — |
| `prefer` | `header` | `Prefer` | `string` | no | `"return=minimal"` |
| `payPalAuthAssertion` | `header` | `PayPal-Auth-Assertion` | `string` | no | — |
| `body` | `body` | — | `OrderRequest` | yes | — |

| Type | Schema value | Source |
| --- | --- | --- |
| `OrderRequest` | `orderRequestSchema` | `src/models/order-request.ts` |
| `Order` | `orderSchema` | `src/models/order.ts` |
| `Error` | `errorSchema` | `src/models/error.ts` |


### getOrder

- **Signature**: `getOrder(request: Orders.GetOrderRequest, options?: RequestOptions): ApiPromise<Order, Orders.GetOrderError>`
- **Wire**: `GET /v2/checkout/orders/{id}`
- **Auth**: `oauth2`
- **Request body**: none — no `Content-Type` header is sent
- **Returns**: `Order`
- **Error**: `PaypalError` with `kind: "api"`, an instance of `Orders.GetOrderError` — **typed arms**, narrowed on `err.payload.kind`
- **Error arms**: `"error"` [401] `Error` · `"error2"` [404] `Error` · `"error3"` [default — any status no arm above covers] `Error` · `"undeclared"` [a `default`-matched body that did not fit `Error`] `rawBody: ArrayBuffer`

**Fields** — `Orders.GetOrderRequest` (4):

| Field | Channel | Wire | Type | Req |
| --- | --- | --- | --- | --- |
| `id` | `path` | — | `string` | yes |
| `fields` | `query` | — | `string` | no |
| `payPalMockResponse` | `header` | `PayPal-Mock-Response` | `string` | no |
| `payPalAuthAssertion` | `header` | `PayPal-Auth-Assertion` | `string` | no |

| Type | Schema value | Source |
| --- | --- | --- |
| `Order` | `orderSchema` | `src/models/order.ts` |
| `Error` | `errorSchema` | `src/models/error.ts` |




<!-- Source: SDK map/operations/payments.md; selected complete operation blocks; MIT -->

### getCapturedPayment

- **Signature**: `getCapturedPayment(request: Payments.GetCapturedPaymentRequest, options?: RequestOptions): ApiPromise<CapturedPayment, Payments.GetCapturedPaymentError>`
- **Wire**: `GET /v2/payments/captures/{capture_id}`
- **Auth**: `oauth2`
- **Request body**: none — no `Content-Type` header is sent
- **Returns**: `CapturedPayment`
- **Error**: `PaypalError` with `kind: "api"`, an instance of `Payments.GetCapturedPaymentError` — **typed arms**, narrowed on `err.payload.kind`
- **Error arms**: `"error"` [401] `Error` · `"error2"` [403] `Error` · `"error3"` [404] `Error` · `"error500"` [500] no body · `"error4"` [default — any status no arm above covers] `Error` · `"undeclared"` [a `default`-matched body that did not fit `Error`] `rawBody: ArrayBuffer`

**Fields** — `Payments.GetCapturedPaymentRequest` (2):

| Field | Channel | Wire | Type | Req |
| --- | --- | --- | --- | --- |
| `captureId` | `path` | `capture_id` | `string` | yes |
| `payPalMockResponse` | `header` | `PayPal-Mock-Response` | `string` | no |

| Type | Schema value | Source |
| --- | --- | --- |
| `CapturedPayment` | `capturedPaymentSchema` | `src/models/captured-payment.ts` |
| `Error` | `errorSchema` | `src/models/error.ts` |


### getRefund

- **Signature**: `getRefund(request: Payments.GetRefundRequest, options?: RequestOptions): ApiPromise<Refund, Payments.GetRefundError>`
- **Wire**: `GET /v2/payments/refunds/{refund_id}`
- **Auth**: `oauth2`
- **Request body**: none — no `Content-Type` header is sent
- **Returns**: `Refund`
- **Error**: `PaypalError` with `kind: "api"`, an instance of `Payments.GetRefundError` — **typed arms**, narrowed on `err.payload.kind`
- **Error arms**: `"error"` [401] `Error` · `"error2"` [403] `Error` · `"error3"` [404] `Error` · `"error500"` [500] no body · `"error4"` [default — any status no arm above covers] `Error` · `"undeclared"` [a `default`-matched body that did not fit `Error`] `rawBody: ArrayBuffer`

**Fields** — `Payments.GetRefundRequest` (3):

| Field | Channel | Wire | Type | Req |
| --- | --- | --- | --- | --- |
| `refundId` | `path` | `refund_id` | `string` | yes |
| `payPalMockResponse` | `header` | `PayPal-Mock-Response` | `string` | no |
| `payPalAuthAssertion` | `header` | `PayPal-Auth-Assertion` | `string` | no |

| Type | Schema value | Source |
| --- | --- | --- |
| `Refund` | `refundSchema` | `src/models/refund.ts` |
| `Error` | `errorSchema` | `src/models/error.ts` |


### refundCapturedPayment

- **Signature**: `refundCapturedPayment(request: Payments.RefundCapturedPaymentRequest, options?: RequestOptions): ApiPromise<Refund, Payments.RefundCapturedPaymentError>`
- **Wire**: `POST /v2/payments/captures/{capture_id}/refund`
- **Auth**: `oauth2`
- **Request body**: `application/json` — the `body` field. **Optional**: omit it and the request carries no body and no `Content-Type` header at all
- **SDK-sent**: `header Idempotency-Key` (minted per call)
- **Returns**: `Refund`
- **Error**: `PaypalError` with `kind: "api"`, an instance of `Payments.RefundCapturedPaymentError` — **typed arms**, narrowed on `err.payload.kind`
- **Error arms**: `"error"` [400] `Error` · `"error2"` [401] `Error` · `"error3"` [403] `Error` · `"error4"` [404] `Error` · `"error5"` [409] `Error` · `"error6"` [422] `Error` · `"error500"` [500] no body · `"error7"` [default — any status no arm above covers] `Error` · `"undeclared"` [a `default`-matched body that did not fit `Error`] `rawBody: ArrayBuffer`

**Fields** — `Payments.RefundCapturedPaymentRequest` (6):

| Field | Channel | Wire | Type | Req | Default |
| --- | --- | --- | --- | --- | --- |
| `captureId` | `path` | `capture_id` | `string` | yes | — |
| `payPalMockResponse` | `header` | `PayPal-Mock-Response` | `string` | no | — |
| `payPalRequestId` | `header` | `PayPal-Request-Id` | `string` | no | — |
| `prefer` | `header` | `Prefer` | `string` | no | `"return=minimal"` |
| `payPalAuthAssertion` | `header` | `PayPal-Auth-Assertion` | `string` | no | — |
| `body` | `body` | — | `RefundRequest` | no | — |

| Type | Schema value | Source |
| --- | --- | --- |
| `RefundRequest` | `refundRequestSchema` | `src/models/refund-request.ts` |
| `Refund` | `refundSchema` | `src/models/refund.ts` |
| `Error` | `errorSchema` | `src/models/error.ts` |

