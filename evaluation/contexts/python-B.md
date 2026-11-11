# Frozen APIMatic SDK guidance

Language: python. SDK source commit: 143e57f2a3729d7df3727386b8c9ddf023d9a5df. Skills source commit: 7cbdf85dc95f09d9ede8c5d349506686684fa0d4. These source excerpts retain their upstream spelling. The candidate workspace contract controls what can be changed or executed.

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



<!-- Source: .agents/skills/python-integrate-paypal/SKILL.md; MIT; original SHA-256 1b50273aebdb907bb96840fd4a36ac94b1c83f58f1b87c1d0251ed2b680f48ae -->

---
name: "python-integrate-paypal"
description: "MANDATORY FIRST STEP for Paypal Python SDK work in a Python project — load this BEFORE you write any code; Python SDK ONLY, never load it for any other language. Applies when asked to integrate Paypal in Python — adds tracking information for an order, activates the subscription, cancels the subscription, creates a subscription, lists billing plans, lists transactions for a subscription, list all subscriptions for merchant account, suspends the subscription — or when a Paypal Python SDK call errors or behaves unexpectedly. Knowing the SDK exists is NOT a substitute for loading this, because it carries five binding gates stated NOWHERE else and not inferable from the package — (1) load python-getting-started, confirm the package is actually installed and read the SDK map that ships with it before any lookup, (2) the exact plan-file path and the no-project-file-edits window until a contract sheet with no open lookups exists there and you have read it, (3) the mandatory load of every python-* companion skill the sheet names, (4) sync-vs-async decided once from the host application before the first call, and (5) the memory ban, where every signature, wire alias, error union and enum member comes from a lookup and never from recall or runtime introspection."
---

# Paypal Python SDK — Integration workflow (lookup layer + contract sheet)

You do the SDK lookups yourself: `python-getting-started` is your **lookup layer** — load it and ground every contract fact in it (and in the source modules its table names) before writing code. The `python-*` companion skills are a different thing: they are API-agnostic *usage* guidance, they are yours to load, and Step 1c below makes loading them mandatory.

## Your lookup layer

- **`python-getting-started`** is the entry point for every SDK need. It carries the SDK's identity (distribution name vs import root, version, Python floor, install-from-source), what the root package exports and the four modules the surface splits across, environments and the base-URL knob, the auth pattern, the controllers, and a **module table** naming the one file that owns each kind of fact. Load it first, always.
- **The SDK map is your lookup surface, and you open it yourself.** The SDK ships `sdk-map.md` and `map/operations/` at its root. There is no helper agent on the Python side — the map is yours to read, not something to delegate. `python-getting-started` tells you how to traverse it: read `sdk-map.md` once, then the one controller page your operations live on.
- **The installed package is the ground truth; the module table is only the locator.** Confirm the package is importable before you rely on a lookup — `python -c "import paypal, pathlib; print(pathlib.Path(paypal.__file__).parent)"`. **If it is not installed, install it first** — `python-getting-started` carries the command; until then mark the fact `UNVERIFIED`, say what would settle it, and do not fill the hole from memory. (The distribution is not on any package index — it installs from its repository; `python-getting-started` carries the command.)
- **Read scoped.** Those modules carry long design docstrings. `grep -n` for the symbol and read the surrounding lines rather than whole files, and never copy a docstring's design rationale onto a contract sheet — the sheet carries facts an implementer must obey, not the reasoning behind them.
- **Write a contract sheet with no open lookups** before you implement: exact signatures, the keyword-only boundary, wire aliases, required-vs-`UNSET` members, the `ApiError.error` union per operation, and enum members for the operations in scope. `python-getting-started` ends with a checklist of the rows a Python sheet is incomplete without — treat that list as the checklist for your own sheet, and collect every in-scope operation in ONE pass rather than re-opening a module per member.

**Scope guard:** the APIMatic-generated Paypal **Python SDK** (import root `paypal`, distribution `paypal`) in **Python projects only**. Unrelated API, or any language other than Python — do nothing; this skill does not apply.

## Workflow

**If the user opens with a reported SDK error or unexpected Paypal behaviour** (not new feature work), skip the plan-first flow: load `python-getting-started` and `python-error-handling`, look the failing symbol up in the module the table names, and fix from what you find. Otherwise, for implementation work:

### Step 1 — Plan first (always, for any implementation work)

Your FIRST action is to load `python-getting-started` and work through the user's full request (all features in scope — one plan covers the whole implementation). Then write the plan and its contract sheet to `<project repo root>/paypal-plan.md` — that absolute path, not a location you pick later.

**Do the read-only prerequisites in the same pass — they need no SDK knowledge and touch no project file:**

- the repo survey (read-only exploration of conventions, layering, and **whether the project is sync or `async`**) — capture each convention as *pattern + the ONE exemplar file path to imitate*, NOT inline code snippets: you will read the exemplar at edit time anyway, so a snippet dump gets paid for twice;
- **establish the toolchain before you need it**: which environment manager the repo uses (`uv`, `poetry`, `pip` + venv, `pdm`), whether `paypal` is already a dependency and at what version, and the exact commands that run the project's tests and type checker. Getting this wrong later costs a broken install mid-implementation — and an uninstalled package costs you the lookup layer itself;
- a baseline run of the project's checks (`pytest`, `mypy`, `ruff` — whatever it has) on the UNTOUCHED tree, so later failures are attributable to your changes;
- credentials/environment verification (per the task's secret-handling rules) — including which host `base_url` will select, since omitting it is silent;
- **a read-only smoke of each in-scope operation against the real credential**, run from your scratchpad, not the project, once the map has given you the signatures and before you finalise the sheet. A plan-, region- or entitlement-gated endpoint answers `403` here — the map presents every operation uniformly and cannot know which ones your key may call — and learning that now reorders the plan rather than the build. Skip only operations whose side effects you cannot reverse;
- setting up your task tracking.

Never use the planning phase to get a "head start" on implementation: **creating or editing ANY project file before the gate below is a defect**, no matter how obvious the code seems.

**HARD GATE — no project-file creation or edits until:** `paypal-plan.md` EXISTS at the repo root, its contract sheet has **no open lookups**, and you have read it. The gate bars coding "meanwhile"; it does not bar the read-only prerequisite work above. Starting to code before the sheet exists defeats the entire plan-first design.

**What the gate does not cover:** creating or activating a virtual environment, installing `paypal` and the toolchain into it, and the files those writes produce (`.venv/`, a lockfile the installer updates) are **prerequisites, not project-file edits**. On a greenfield repo they are the only way to reach the lookup layer at all, and they are the only writes permitted before the gate. Nothing you author by hand may change.

**DUPLICATE CLAIMS** — one row per write a caller can trigger twice; `none` if the task has no such write (`python-configuration-resilience`, *The same operation arriving twice*).

| Write | Where the claim is stored | What rejects the second one | Where that rejection is caught | Where in the code |
| --- | --- | --- | --- | --- |

Every row follows one order: **claim → SDK call → record the result**. The claim is a write of its own, made before the SDK call, so a second caller is stopped before it reaches the provider; release it when the provider refuses the call.

⚠⚠ **Where the claim is stored**: a store this application owns — the one the codebase already keeps its records in — never the provider. A provider idempotency key goes beside the claim, never in place of it; the SDK's own `Idempotency-Key` header is not one — it is new on every call. If this codebase has nowhere to keep a claim that outlives the process, that is a Blocker in the plan's **Assumptions & Blockers**, not a row.

⚠⚠ **What rejects the second one**: the store refusing the second caller's claim, the way this codebase already refuses a duplicate. A conflict on the save *after* the SDK call is too late — both callers have already reached the provider. A read before the write — a status check, a lookup by key — is not a refusal either: it lets both callers through. Pick a refusal the store you run against enforces.

**Where that rejection is caught**: the `except` for what the store raises on the second claim — a lookup that returns the earlier result is not an `except`.

Write `TBD` in **Where in the code** while you plan — every row; it names code not yet written, not a contract fact, so it is not an open lookup. Once the code type-checks, replace each `TBD` individually with two functions, in order: the claim write, then the SDK call it precedes. Only this column changes after coding starts. ⚠⚠ A `TBD` left behind, a function that is not in the code, or one note covering several rows is **not addressed**; if the code does not do what the row says, fix the code, then the cell.

### Step 1c — Required reading (do this before you write any code)

End the contract sheet with a **REQUIRED READING** block whose rows carry inline `MUST load <skill>` pointers. **Load every `python-*` skill the sheet names, now, before you start implementing** — not lazily at the step that needs it. The sheet deliberately does *not* carry the how-to: it names the hazard and hands you the skill that resolves it, so an unloaded pointer is a gap in what you know, not a formality.

**A fixed floor applies regardless of what the sheet says** — the sheet can add to it, never remove from it: `python-error-handling` always (every integration writes an error boundary); `python-client-initialization` before the client is constructed; `python-testing` before the first test file you create or edit, *including* a throwaway verification script that fakes the transport. A sheet row that excuses one of these ("out of scope", "no test suite requested") is not a substitute for loading it.

These are API-agnostic usage skills; loading them is not a substitute for the lookup layer, and reading a module in the installed package does not remove the need to load the skill for that step. Contract *facts* still come only from your sheet or a fresh lookup.

Before implementing, check the plan's **Assumptions & Blockers** section:

- Blocker or major assumption → surface it to the user in plain language, get their answer, and revise `paypal-plan.md` in place.
- Minor assumptions only → proceed.

Full re-planning only on genuine scope change; for a single missing fact mid-implementation, do the lookup, never guess.

### Step 2 — Implement from the contract sheet

1. Read `paypal-plan.md` once. Treat its contracts as authoritative — do not re-derive or "double-check" them from memory. When a lookup revises a row, update the file so the sheet and the code never disagree.
2. **Decide sync vs async once, from the host application, before the first call** — and take the decision from the repo survey, not from preference. This SDK ships two complete client classes (`Client` / `AsyncClient`) and there is no bridge between them: a sync client in an `async def` blocks the event loop, and an async client in sync code is a coroutine nobody awaits. Getting this wrong is not a local fix later; it is every call site. The choice also changes the transport-override keyword (`custom_http_client` vs `custom_async_http_client`) and the teardown obligation (`close()` vs `await aclose()`).
3. **Pick the response mode per call, deliberately.** Each operation exists twice: the plain call raises `ApiError` on failure, and its `with_raw_response` peer returns `ApiResult` instead. For the operations that return `None`, the raw peer is the only way to observe the status code — so a call whose outcome you must inspect needs the mode chosen at write time, not retrofitted.
4. Implement sequentially, following the repo's own conventions and layering. You loaded the companion skills the sheet named in Step 1c — implement each step in line with the one that governs it. Take every contract *fact* (signatures, wire aliases, error unions, enum members) from the contract sheet or a fresh lookup — never re-derive one from a companion.
5. After every change: run the project's **type checker** (`mypy`/`pyright`) as well as its tests. The package ships `py.typed` and is generated under `mypy --strict`, so a type error against it is a real contract violation, not noise — it is the closest thing Python gives you to the compile step. **Treat a clean type check as the gate you do not skip.** If the project has no type checker configured, install `mypy` into the environment and run `mypy --strict` on the files you touched — the SDK is generated under that setting, so it checks cleanly against it. If you genuinely cannot install one, say so in your final report rather than silently substituting a smoke run. Fix non-SDK errors yourself.
6. **Any error involving an SDK type or member** — an `AttributeError`/`TypeError` on a `paypal.*` object, a `pydantic.ValidationError` you cannot place, a mypy error naming an SDK type, an unexpected `ApiError` — → go back to `python-getting-started`'s module table and read the one module that owns the fact. Do not attempt more than one self-fix of an SDK-name error before doing that lookup: rewriting from the same knowledge that produced the error is guessing. Remember that a **decode failure raises `ValidationError`/`ValueError`, not `ApiError`, and bypasses both response modes**, and that `httpx2` transport exceptions arrive unwrapped — so an exception that does not look like an API error may still be one of the SDK's failure kinds.
7. Once the code is complete, open each function the **DUPLICATE CLAIMS** rows name and confirm it runs when that write runs. Where the code falls short of a row, fix the code, not the row.
8. Run the project's tests; verify the integration end to end the way the task demands. Retrying is **on by default**, so decide whether the task keeps it, tunes it through `retry_options`, or turns it off with `max_retries` set to `0`, rather than wrapping the call in a retry of your own — and say which you did.

### Step 3 — Answering pure questions

A standalone Paypal question with no code change: look it up in `python-getting-started` (and the module its table names), then give the grounded answer. Never answer from memory, even for "easy" questions.

## Anti-patterns — never do these

- **Always load `python-getting-started` first.** It is your lookup layer, not optional background. (The `python-*` companions are the complement: load the ones the sheet names, per Step 1c.) Don't re-derive a contract *fact* from a companion — exact signatures, wire aliases, error unions and enum members come from the sheet or a fresh lookup.
- **Never write a Paypal/SDK fact from memory** — every signature, field name, enum member, and error union in your code must come from the contract sheet or a lookup. And **never write a call from memory "to fix later".**
- **Don't web-search Paypal topics to find an implementation detail** — the installed package's own source is the ground truth, and the module table tells you where to look. Public Paypal docs describe the REST API, not this SDK's generated surface, and the two disagree on names.
- **Never introspect the SDK at runtime to discover its shape.** `dir()`, `model_fields`, `inspect.signature`, or a REPL poke is the Python-flavoured version of decompiling the package: it answers what exists, never what is *supported*, and it silently invites private attributes into your code. Read the source module instead.
- **Don't grep the package to *locate* a type** — the SDK map is the locator (and says so: *"Never grep for a type"*); grep only *inside* the module its **Type sources** table names, for the symbol. A sweep for a *shape* is a different thing, and is fine: "every member typed `Optional[Any]`", "every discriminator field" are cross-cutting questions nothing indexes, and one targeted `grep -rn` over `models/` is the right tool for them — record what it found on the sheet.
- **Don't vendor, `sys.path`-hack, or editable-install the SDK from a throwaway clone** to make a lookup possible. Install the distribution properly into the project's environment (see `python-getting-started`); an editable install pointed at a clone breaks every import the moment the clone is deleted.
- **Don't create or edit project files before the HARD GATE** in Step 1 — plan and contract sheet first, code second.




<!-- Source: .agents/skills/python-getting-started/SKILL.md; MIT; original SHA-256 50a4b8904ee7d0264442ef333448edb49ac1b4858b3f2b5ba95e66de5b48c96d -->

---
name: "python-getting-started"
description: "Paypal Python SDK identity and lookup layer (Python only) — install, import root, base URL/environments, the auth pattern, the SDK map that ships at the SDK root (`sdk-map.md` + `map/operations/`) and how to traverse it, and the module table naming the one file owning each fact the map leaves to the source. Load this before answering any Paypal Python SDK contract question or writing any SDK code."
---

# Getting started with the Paypal Python SDK

> **Who this skill is for.** This is the **lookup layer** for anyone writing Paypal Python SDK code — it is yours to follow directly and fully. Ground every contract fact here (in the SDK map, and in the source modules it names) rather than in recall, and carry those facts onto a contract sheet before you implement. Load `python-integrate-paypal` for the workflow that wraps this skill.

This is the **SDK-specific** entry point. For general patterns that apply to any APIMatic-generated Python SDK (client construction, auth, calling endpoints, models, error handling, resilience, testing), see the companion API-agnostic skills: `python-client-initialization`, `python-authentication`, `python-calling-endpoints`, `python-models`, `python-error-handling`, `python-configuration-resilience` and `python-testing`.

**This page and those companion skills are complementary — load both.** This page is authoritative for the SDK's *identity and surface* (what to install, what to import, the controllers, which module owns which fact); the companion skills are the *usage layer* on top — the best-practice way to call each piece and the gotchas a signature cannot show. Reading a module in the installed package does not remove the need to load the skill for that step, so at each step below, load the companion *and* confirm names against the installed package.

## SDK identity

Verified against `paypal/` and `pyproject.toml` of the generated package at version `2.29`. **Re-verify after a version bump** — this page is a snapshot, not a live read.

| Fact | Value |
| --- | --- |
| API | Paypal |
| Distribution name (what you install) | `paypal` — **not on any package index**; installed from source (see *Install*) |
| Import root (what you import) | `paypal` — the same string you install |
| Source repository | https://github.com/context-plugins/paypal-python-sdk |
| Source branch | `main` |
| Version | `2.29` |
| Sync client class | `PaypalClient` (alias `Client`) |
| Async client class | `AsyncPaypalClient` (alias `AsyncClient`) |
| Client construction | **keyword-only**: `base_url` · `timeout` (default `30.0`) · `retry_options` · `oauth2` · `oauth2_token_source`, and the transport override — `custom_http_client` on the sync client, `custom_async_http_client` on the async one (the names differ; see step 1) |
| Auth | **OAuth 2.0** client credentials — set `oauth2` |
| Environments | **no environment enum** — one `base_url` string, defaulting to `https://api-m.sandbox.paypal.com` |
| Base-URL config | `ServerConfig` (`paypal/server/server_config.py`), frozen, `extra="forbid"` |
| Python floor | **`>=3.10`** (classifiers list `3.10–3.14`) |
| Runtime dependencies | `httpx2 (>=2.13.1,<3.0.0)` · `certifi (>=2024.7.4)` · `pydantic[email] (>=2.11.0,<3.0.0)` · `typing-extensions (>=4.13.0,<5.0.0)` |
| Typing | ships `py.typed`; the package is checked under `mypy --strict` with `warn_unreachable`. Callers get full inference — **a type error against this SDK is a real contract violation, not noise** |
| Line length / lint | `ruff`, 120 cols (only relevant when editing the SDK itself) |
| Surface | 40 operations across 5 controllers · 284 models · 0 unions · 87 enums · 39 per-operation error unions |

The table above is **orientation, not a copy-paste recipe** — it gives you the names and facts (install, import roots, the auth *pattern*, the base-URL knob), while the actual integration code comes from the companion skills. Load each one as you reach its step (see **Integration workflow** below) and confirm its types against the installed package.

## Install — from source

Into the same environment your project runs in, install the distribution from its repository, <https://github.com/context-plugins/paypal-python-sdk> — it is not published to a package index:

```bash
pip install "paypal @ git+https://github.com/context-plugins/paypal-python-sdk.git@main"
python -c "import paypal, pathlib; print(pathlib.Path(paypal.__file__).parent)"
```

**Run the second line too.** A `pip install` that reports success is not proof the SDK is importable where your project runs. If the probe raises `ModuleNotFoundError`, the install went into a different interpreter: re-run it through the one your project uses (`python -m pip install …`) and probe again. If it prints a path whose contents are not this SDK, what you installed is not this distribution.

The distribution carries its own `pyproject.toml`, so `pip` builds and installs it like any released package, copied into site-packages. Do not vendor its source into your project, add its directory to `sys.path`, or install it editable (`-e`) from a throwaway clone — an editable install points at that directory, so deleting the clone breaks every import.

Once the second line prints this SDK's directory, write the imports from the table above: the distribution name you install and the package name you import are the same string. Requires Python 3.10 or newer.

## Imports — the package splits its surface across four modules

Python does not re-export child modules transitively, so `from paypal import models` alone does **not** make enums, error unions, or runtime types reachable. Import each kind of type from the module that owns it.

`paypal/__init__.py` exports exactly 5 names beside the `paypal.models` subpackage it re-exports:

```python
from paypal import (
    AsyncClient,
    AsyncPaypalClient,
    Client,
    PaypalClient,
    ServerConfig,
)
```

Everything else comes from its own subpackage, and the split matters because each kind of type a caller reaches for lives in a different module:

| What you need | Where it lives |
| --- | --- |
| Domain models, their `…Dict` companions | `paypal.models` |
| Enums (and their open `…OrStr` aliases) | `paypal.models.enums` |
| `ApiError` · `RawError` · `ApiResult` · `RequestOptions` · `ClientCredentials` · `HttpClient` · `SdkBaseModel` · `UNSET` · `Optional` | `paypal.core` |
| Per-operation error *unions* | `paypal.errors` (`ActivateBillingPlanErrorBody`, …) |

`paypal.core` re-exports its whole public surface (a curated `__all__`), so import from `…core` rather than from the private modules beneath it (`…core.results`, `…core.exceptions`, `…core.auth.schemes`).

## Environments — there is no environment enum

This SDK has **no environment type and no environment constants**. There is one knob: `base_url`, on `ServerConfig` (`paypal/server/server_config.py`), and its default is **`https://api-m.sandbox.paypal.com`**:

```python
base_url: str = "https://api-m.sandbox.paypal.com"
```

Consequences to state on every contract sheet that touches configuration:

- Omitting `base_url` gives you **`https://api-m.sandbox.paypal.com`**, silently. A caller who believes they configured a different host and did not gets that host's behaviour with live credentials.
- The token endpoint is derived from the same base URL (`/v1/oauth2/token`), so it moves only with `base_url` — you never configure it separately.
- `ServerConfig` is a frozen pydantic model with `extra="forbid"`: a misspelled keyword raises `ValidationError` at construction rather than being ignored.
- `timeout` is validated too — the base client raises `ValueError` for any non-positive value.

## Auth pattern (one scheme)

OAuth 2.0 client credentials, exposed as the client's `oauth2=` keyword taking `ClientCredentials` **or a plain dict**. The client fetches and caches the bearer token itself, lazily, from `<base_url>/v1/oauth2/token`.

```python
from paypal import Client
from paypal.core import ClientCredentials

client = Client(oauth2=ClientCredentials(client_id="…", client_secret="…"))
client = Client(oauth2={"client_id": "…", "client_secret": "…"})   # equivalent
```

**Every credentials keyword is optional at the type level and that is a trap worth flagging on every sheet.** Omit it and the client is built with `no_auth`: every request goes out unauthenticated. Nothing fails at construction. Most APIs then answer `401`; an API that serves anonymous traffic at all answers `200` and hides the omission entirely — verify the keyword is set rather than waiting for a `401` to tell you.

See `python-authentication` for the full picture, including what a *failed token fetch* raises — it is not what a caller expects, and it is the single most common surprise in this SDK.

## Controllers

Controllers and their operation counts (`client.<attr>`):

| Attribute | Class | Ops | Area |
| --- | --- | --- | --- |
| `client.orders` | `Orders` / `AsyncOrders` | 8 | `authorize_order` · `capture_order` · `confirm_order` · `create_order` · `create_order_tracking` · `get_order` · … |
| `client.payments` | `Payments` / `AsyncPayments` | 7 | `capture_authorized_payment` · `get_authorized_payment` · `get_captured_payment` · `get_refund` · `reauthorize_payment` · `refund_captured_payment` · … |
| `client.subscriptions` | `Subscriptions` / `AsyncSubscriptions` | 17 | `activate_billing_plan` · `activate_subscription` · `cancel_subscription` · `capture_subscription` · `create_billing_plan` · `create_subscription` · … |
| `client.transaction_search` | `TransactionSearch` / `AsyncTransactionSearch` | 2 | `search_balances` · `search_transactions` |
| `client.vault` | `Vault` / `AsyncVault` | 6 | `create_payment_token` · `create_setup_token` · `delete_payment_token` · `get_payment_token` · `get_setup_token` · `list_customer_payment_tokens` |

Every controller has an `Async…` peer whose operations are identical in name and parameters and differ solely by being awaited. Do not emit a separate row for an async operation; state the rule once on the sheet.

The SDK map's controller table carries the same counts and links to a page per controller (`map/operations/<controller>.md`) — go there for the operations themselves.

## SDK map — look up first, open the module second

The SDK ships a generated map at its **root** — the directory holding `pyproject.toml`, the `paypal/` source directory, and these two entries:

- **`sdk-map.md`** — the index: client construction with the full constructor-keyword table, the error-handling model (`ApiError` / `ApiResult` / `RawError`, Case A vs Case B), where models, enums and error aliases live, servers and auth, and the link table into the operations pages.
- **`map/operations/<controller>.md`** — one page per controller, one `###` block per operation: the HTTP verb and route, the sync parsed signature, each parameter's role and wire name, both return types, the error alias with the status each arm maps from, and a **Type sources** table naming the module that declares every *generated* type the operation mentions.

**Installing the distribution does not give you the map.** `pyproject.toml` ships the `paypal/` package only, so `sdk-map.md` and `map/operations/` are absent from the installed package — they live in the SDK's own source tree, at the root of its repository, <https://github.com/context-plugins/paypal-python-sdk>, in lockstep with the code the map describes — clone it to a temporary directory, outside the project repo:

```bash
git clone --depth 1 --branch main https://github.com/context-plugins/paypal-python-sdk
```

Confirm the map comes from the release you installed before you read anything out of it: the clone above is pinned to `main`, the branch this SDK is released from — the repository's default branch may carry a different version. A map read from any other release describes code you do not have.

Every `Source` path on the map is relative to that SDK root, so `paypal/models/activate_subscription_request.py` opens as written from there — and the same path resolves inside the installed package, which is where you read a module's body once the map has named it.

**The map is the locator; the source modules are the shapes.** Read the map first — signatures, routes, parameter roles, return types, error unions, and which module declares a type are all answered there without opening a single `.py` file. Then open the one module the map names for what it deliberately does not carry: a model's members, an enum's values, a field's wire alias. The map says so itself — *"Shapes live only in the source … Never grep for a type."*

**The map carries shapes; what an operation *means* lives elsewhere.** When *what* to pass depends on meaning — which values a field accepts beyond its type, a rule that couples two fields, what a defaulted parameter actually selects — the map will not settle it. Open the operation's docstring in `paypal/apis/<controller>.py` (or `client.py` where operations sit on the client) and `api-reference.md` at the SDK root for that operation *before* writing the sheet row, and record what you found there. A value you already "know" for a field the map types as a plain `str` is a lookup, not a recall — the memory ban applies to it.

`sdk-map.md` carries the invariants every operation block assumes, so load it before any `map/operations/` page; the pages are written to be read beside it.

## Contract facts — the map first, then the module

**Six of these are map lookups — don't open the module for them:** an operation's signature, parameters and return type; the client's constructor keywords; the `timeout` default; the members of `ApiError` / `Success` / `Failure` / `RawError`; an operation's error union and the status each arm maps from; base-URL and auth wiring. The table below covers everything else, and the full body behind a map row.

Read the one module that owns the fact **inside the installed package**. Locate it first:

```bash
python -c "import paypal, pathlib; print(pathlib.Path(paypal.__file__).parent)"
```

Failing that, it is under the project's environment (`.venv/Lib/site-packages/paypal` on Windows, `.venv/lib/python3.*/site-packages/paypal` elsewhere). **If the package is not installed, install it first** — see *Install* above; until then mark the fact `UNVERIFIED` and say what would settle it rather than answering from memory. Paths below are relative to that package root:

| Question | Module |
| --- | --- |
| An operation's real signature, parameters and return type | `apis/<controller>.py` |
| Client construction, keywords, controller wiring | `client.py`, `async_client.py`, `base_client.py` |
| Timeout default and validation | `base_client.py` (`DEFAULT_TIMEOUT = 30.0`) |
| The request/response pipeline, 401 handling, 2xx-vs-error split | `core/raw_client.py` |
| Exception shape (`ApiError.error`, `.status_code`, `.headers`) | `core/exceptions.py` |
| `Success`/`Failure`/`RawError` | `core/results.py` |
| Per-call overrides | `core/request_options.py` |
| `UNSET`, `Optional`, `OptionalNullable` | `core/optionality.py` |
| Model base config, `to_dict`/`to_json` | `core/models.py` |
| A model's members, required vs `UNSET`, wire aliases | `models/<model_name>.py` |
| An enum's members and wire values | `models/enums/` |
| Open-enum coercion | `core/converters/open_enum.py` |
| Date/time wire formats — `Date`, `RFC3339DateTime`, `RFC1123DateTime`, `UnixSecondsDateTime` (`Annotated` aliases over `datetime.date` / `datetime.datetime`; not in the map's Type sources) | `core/converters/date_time.py` |
| Transport protocols (the test seam) | `core/transport.py` |
| httpx2 adapter, proxy/TLS knobs | `core/httpx2_transport.py` |
| Token fetch, credential placement | `core/auth/`, `core/auth/models.py` |
| Base-URL resolution | `server/server_config.py`, `server/server.py` |
| An operation's error mapper (status → schema) | `errors/<operation>_error.py` |

**Read scoped.** These modules carry long design docstrings; `grep -n` for the symbol and read the surrounding lines rather than whole files. Never quote a docstring's design rationale onto a contract sheet — the sheet carries facts an implementer must obey, not the reasoning behind them.

Keep lookups cheap — the rules that keep a session's context small:

- Collect the contracts for **every** in-scope operation in **one** pass — signature, required members with wire aliases, the error union, enum values — into a short **contract sheet** in your plan or working notes, then implement from the sheet. Don't re-open a module per member, and never re-look-up a fact the sheet already carries.
- Recurse into a model's members only where the task actually sets them — a full transitive expansion is hundreds of rows and nobody needs it.
- Trust the interpreter over this page: if a name here ever fails to type-check or import, re-read the module the table above names and report the drift; never patch around it from memory.

## Integration workflow — load the companion skill at each step

Before you write the code for each step, load the named companion skill — even if you have already read the relevant module. Each step calls out the trap the signature hides (in *parens*). A typical integration reaches them in this order:

1. **Client construction & lifetime** — load **python-client-initialization** before you write `Client(...)` or `AsyncClient(...)`. (*The signature won't tell you:* the constructor is keyword-only, so nothing can be passed positionally; the client owns an `httpx2` connection pool and you **must** `close()` (sync) or `await aclose()` (async) or use it as a context manager; it must be long-lived and module- or app-scoped, never rebuilt per request; the sync and async clients do not mix; and the transport-override keyword differs by client — `custom_http_client` vs `custom_async_http_client`.)
2. **Authentication** — load **python-authentication** before you set credentials. The one scheme is `oauth2=`. (*The signature won't tell you:* every credentials keyword is *optional* — omit it and every request goes out unauthenticated, with no failure at construction and not necessarily a `401` to tell you; the token is fetched lazily and cached by the client; and a **failed token fetch** raises something other than what a caller expects and **bypasses the non-raising response mode** entirely. Load secrets from the environment or a secret store, never hardcode.)
3. **Calling an endpoint** — load **python-calling-endpoints** before the first `client.<controller>.<operation>(...)` call. (*The signature won't tell you:* every operation splits positional path params (and sometimes the body) from a keyword-only tail after `*`; every keyword-only parameter has a **real** default, so there is no "must pass `None` explicitly" hazard; **11 operations return `None`**, so `with_raw_response` is the only way to observe their status code; and the two response modes — raising vs `ApiResult` — behave differently on failure.)
4. **Models** — load **python-models** the moment a request/response member is not a plain string or number. (*The signature won't tell you:* `Optional[T]` here is `T | UnsetType`, **not** `typing.Optional` — `None` is not a legal value for it; models are frozen pydantic instances with `…Dict` TypedDict companions; enums are **open** (`…OrStr`), so an unknown wire value passes through as a plain `str` rather than raising; wire aliases differ from Python member names; unknown response fields are **preserved**, not dropped; and serialize via `to_dict`/`to_json`.)
5. **Error handling** — load **python-error-handling** before you write any `try/except`. (*The signature won't tell you:* there is a single `ApiError` type whose `.error` is a **per-operation union**, and a decode failure raises `ValidationError`/`ValueError`, not `ApiError`, and bypasses both response modes; `httpx2` transport exceptions reach your boundary unwrapped.)
6. **Configuration & resilience** — load **python-configuration-resilience** when you set the base URL, timeouts, retries, proxies, TLS, or logging. (*The signature won't tell you:* **retrying is on by default** — `retry_options` takes a count, a `RetryOptions` or its dict, `max_retries` set to `0` turns it off, and one call overrides it through `request_options`; a `401` is never retried; `timeout` defaults to `30.0` and is a single float that maps onto `httpx2`'s timeout semantics, limiting each wait rather than the whole call; and there is no logging hook — you wrap the transport seam.)
7. **Testing** — load **python-testing** before you stub the SDK. (*The signature won't tell you:* the seam is the **transport protocol** (`HttpClient`/`AsyncHttpClient` in `core/transport.py`) passed as `custom_http_client` — not the client class; a fake transport implements `send` and `close`, the two the protocol declares, and `send` answers with the head alone; assert on the request the SDK actually built, and cover all four failure kinds, decode failures included.)

## What a contract sheet must carry for this SDK

Beyond the usual signatures and model members, a Python sheet is incomplete without these, because each one is a decision the implementer cannot make correctly from the signature alone:

1. **Sync or async** — which client class, and the reminder that the two do not mix. Plus the `close()`/`aclose()` obligation and where the client is held.
2. **The keyword-only boundary** for each operation: what is positional (path params, sometimes the body) and what sits after `*`. Every keyword-only parameter has a real default, so there is no "must pass `None` explicitly" hazard — say so, so nobody writes defensive `None`s.
3. **The 11 operations that return `None`** — `orders.patch_order` · `orders.update_order_tracking` · `subscriptions.activate_billing_plan` · `subscriptions.activate_subscription` · `subscriptions.cancel_subscription` · `subscriptions.deactivate_billing_plan` · `subscriptions.patch_billing_plan` · `subscriptions.patch_subscription` · `subscriptions.suspend_subscription` · `subscriptions.update_billing_plan_pricing_schemes` · `vault.delete_payment_token`. Their raw peers are `ApiResult[None, …]`, so `with_raw_response` is the only way to observe the status code.
4. **Required vs `UNSET`** for every model member the task sets, and the fact that `Optional[T]` here is `T | UnsetType` — **not** `typing.Optional`, so `None` is not a legal value for it.
5. **The `ApiError.error` union** for each operation in scope — there are **three** typed error bodies in this SDK, so the union is never uniform. Every union is `<Typed> | RawError`:
   1. `Error` — 21 operations (`orders.authorize_order` · `orders.capture_order` · `orders.confirm_order` · `orders.create_order` · `orders.create_order_tracking` · `orders.get_order` · `orders.patch_order` · `orders.update_order_tracking` · `payments.capture_authorized_payment` · `payments.get_authorized_payment` · `payments.get_captured_payment` · `payments.get_refund` · `payments.reauthorize_payment` · `payments.refund_captured_payment` · `payments.void_payment` · `vault.create_payment_token` · `vault.create_setup_token` · `vault.delete_payment_token` · `vault.get_payment_token` · `vault.get_setup_token` · `vault.list_customer_payment_tokens`); distinguishing members `name` · `message` · `debug_id`
   2. `SubscriptionError` — 17 operations (`subscriptions.activate_billing_plan` · `subscriptions.activate_subscription` · `subscriptions.cancel_subscription` · `subscriptions.capture_subscription` · `subscriptions.create_billing_plan` · `subscriptions.create_subscription` · `subscriptions.deactivate_billing_plan` · `subscriptions.get_billing_plan` · `subscriptions.get_subscription` · `subscriptions.list_billing_plans` · `subscriptions.list_subscription_transactions` · `subscriptions.list_subscriptions` · `subscriptions.patch_billing_plan` · `subscriptions.patch_subscription` · `subscriptions.revise_subscription` · `subscriptions.suspend_subscription` · `subscriptions.update_billing_plan_pricing_schemes`); distinguishing members `name` · `message` · `debug_id`
   3. `DefaultError` — 1 operation (`transaction_search.search_balances`); distinguishing members `name` · `message` · `debug_id`
   4. *(none)* — `transaction_search.search_transactions`: no typed arm, so `.error` is always `RawError`
   5. So `isinstance(e.error, Error)` matches only 21 of 40 operations.
6. **That a decode failure raises `ValidationError`/`ValueError`, not `ApiError`, in both response modes** — `core/raw_client.py` states this in `execute`'s own docstring. **And that the 2xx path declares at least one required member on 1 return type, so a truncated body fails to decode there and passes silently everywhere else.** Any sheet row for a call whose result is used must name the members the implementer has to assert on.
7. **That retrying is on by default** — `retry_options` on the client tunes it, `max_retries` set to `0` turns it off, and `request_options` overrides it per call — so the sheet says whether this integration keeps, tunes or disables it, and for which methods, since a write is repeated only when the policy names its method.
8. **What limits a whole call.** `timeout` limits each wait, not the call, so a reply whose pieces each arrive within it is never cut off. In async code, state the budget and the one place `asyncio.wait_for` enforces it for every call, and what the boundary returns for its `asyncio.TimeoutError`; in sync code, say there is none.
9. **Which host the `base_url` selects**, because omitting it is silently the default.
10. A **REQUIRED READING** block naming the `python-*` companions that govern the steps, with `MUST load` pointers.




<!-- Source: .agents/skills/python-client-initialization/SKILL.md; MIT; original SHA-256 b15b843c34ebd28cb8bff77573d7901e935f493c05731a82a7c389c182626612 -->

---
name: python-client-initialization
description: Creating and holding an APIMatic-generated Python SDK client in Python — construction, the keyword-only constructor shape, choosing the sync or async class, transport ownership and the close/aclose obligation, and where the client lives in a script, an ASGI app, or a forking worker. Load before wiring the client into an application or writing the factory that builds it.
---

# Initializing an APIMatic Python SDK client

This applies to **any** APIMatic-generated Python SDK. Replace placeholders with the real names from
the SDK you are using:

- `{root_package}` — the import root, used in `import` statements. This differs from the distribution
  name you install: you install the hyphenated name but import the underscored one.
- `{Api}Client` / `Async{Api}Client` — the two client classes.
- `{scheme}` — an auth scheme's keyword, one per scheme the API declares (see `python-authentication`).
- `{group}` — an API group accessor on the client.

## Shape of the client

APIMatic Python SDKs expose **two client classes**, sync and async, built from a keyword-only
constructor:

```python
{Api}Client(
    *,
    # server selection — one of four shapes, see "Choosing the server / base URL"
    timeout: float = 30.0,             # seconds; the generator's default
    retry_options=None,                # None: the default policy; 0 disables; a count, RetryOptions or dict tunes it
    custom_http_client=None,           # your own transport
    {scheme}=None,                     # one credentials keyword per declared scheme
    {scheme}_token_source=None,        # managed-OAuth schemes only
)
```

Every parameter sits after `*` — there are **no positional arguments**, so a positional call is an
immediate `TypeError`. There is no options object, no builder, and no separate configuration type to
populate: everything is a constructor keyword.

Operations are exposed on the client. Most are grouped under **group accessors** (one per API resource
group) and called `client.{group}.{operation}(...)` — for example, a `widgets` group's `list_widgets`
operation is `client.widgets.list_widgets(...)`. An operation that belongs to no group sits **directly
on the client**, called `client.{operation}(...)`. Accessors are `cached_property`, so they are
attributes without parentheses and return the same object each time. The available accessors (and any
direct operations) come from the contract sheet, grounded in the SDK map's controller table
(`sdk-map.md`) — not from a runtime `dir()` or a REPL poke. See
`python-calling-endpoints`.

Both classes are also exported under the fixed aliases `Client` and `AsyncClient`. **Prefer the full
names** — a bare `Client` collides in any application that talks to more than one API.

The async class is a peer, not a variant: same accessors, same operation names, same parameters. Four
names differ:

| | Sync | Async |
|---|---|---|
| Transport keyword | `custom_http_client=` | `custom_async_http_client=` |
| Transport protocol | `HttpClient` | `AsyncHttpClient` |
| Shutdown | `client.close()` | `await client.aclose()` |
| Scope form | `with` | `async with` |

## Choosing sync or async

**Pick one from the host application, not from preference, and pick it before the first call.** There
is no bridge between the two, and they fail asymmetrically:

- An **async client used from sync code** returns a coroutine nobody awaits — a `RuntimeWarning` and a
  silently skipped call.
- A **sync client called from `async def`** blocks the event loop. It returns the right answer, tests
  pass, and every other coroutine starves for the duration. This one surfaces only under production
  concurrency, as unexplained latency elsewhere.

FastAPI / Starlette / Litestar / aiohttp → async. Flask, Django under WSGI, Celery, a CLI, a script →
sync. If both layers issue calls, construct one of each rather than bridging with `asyncio.run` inside
a request handler.

## Direct instantiation

```python
from {root_package} import {Api}Client

client = {Api}Client(
    timeout=10.0,
    {scheme}=...,          # see python-authentication
)
```

`timeout` is validated at construction: non-positive (or NaN) raises `ValueError` immediately.
Credentials passed in dict form are validated by pydantic with `extra="forbid"`, so a misspelled key
raises `ValidationError` there and then.

Two things are **not** validated, so a clean construction does not mean a working client:

- **`base_url` is taken unchecked.** A typo or the wrong environment surfaces as a connection error or
  a `401` at the first call.
- **Credentials are never exercised.** Managed-OAuth schemes fetch the token lazily on the first API
  call, so wrong credentials construct happily and fail later, pointing at whichever operation ran
  first. Every credentials keyword also defaults to `None`, and omitting it configures the client for
  **no auth** — requests go out unauthenticated and the server answers `401`.

### Transport ownership and the close obligation

Unless you supply one, the client builds a **pooled** HTTP transport and owns it. Leaking that pool
raises nothing — only `ResourceWarning`s in test output and sockets accumulating in a long-running
process.

Use the context manager when the client's life matches a scope:

```python
with {Api}Client(...) as client:              # sync: __exit__ calls close()
    ...

async with Async{Api}Client(...) as client:   # async: __aexit__ calls aclose()
    ...
```

The client itself is meant to be **long-lived** — construct it once and reuse it for the app's
lifetime. Don't build one per request: that is a connection pool per request, and under managed OAuth
it also **re-fetches the access token** every time, because the token cache lives on the client. When
the client outlives any scope, close it explicitly at shutdown. Note the asymmetry: the async method
is `aclose`, and calling `close()` on an async client is an `AttributeError`.

## Choosing the server / base URL

Server selection is **not** an environment enum. What the constructor accepts depends on what the spec
declares, in one of four shapes:

| The API declares | Constructor keywords |
|---|---|
| one server, one environment | `base_url: str \| None = None` |
| one server, several environments | `environment` (a string literal alias, with a default), then `base_url` |
| several servers, one environment | `server_config: {Server}ConfigOrDict \| None = None` |
| several servers, several environments | `environment`, then `timeout`, then `server_config` |

Omitting the server keyword falls through to the config's own default rather than writing `None` over
it — and **that default is whatever the spec listed first, which for many providers is a sandbox.**
Nothing announces it. Confirm the default from the contract sheet — the SDK map's *Servers & auth*
section names the base URL each arm resolves to — and pass the server explicitly in
every environment, production included. Server template variables live on the config class, so how you
reach them follows the arm above. **python-configuration-resilience** owns server / base-URL
configuration in full.

## Where the client lives

### ASGI (FastAPI / Starlette / Litestar)

Build it in the lifespan handler and hand it out by dependency injection or `app.state`:

```python
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app):
    app.state.api_client = Async{Api}Client({scheme}=..., timeout=10.0)
    try:
        yield
    finally:
        await app.state.api_client.aclose()

app = FastAPI(lifespan=lifespan)

async def get_client(request: Request) -> Async{Api}Client:
    return request.app.state.api_client          # inject with Depends(get_client)
```

Do not build it inside a route, and do not build it in a startup hook with no matching shutdown.

### WSGI (Django / Flask)

A module-level client, or a lazily-initialised module global, is the pragmatic placement. Close it from
an `atexit` hook if the deployment recycles workers rather than killing them.

### Forking workers (Gunicorn, uWSGI, Celery prefork)

**Construct the client after the fork.** A pool inherited across `fork()` is shared by processes that
each think they own it, and the corruption looks like random protocol errors, not a lifetime bug.
Building it lazily on first use inside the worker is the simplest guarantee; a post-fork hook is the
explicit alternative.

### Threads and event loops

The sync client is safe to share across threads — the token cache is lock-guarded and the pool is
thread-safe. The async client may be built outside a running loop, but from its first use it belongs to
**one** event loop, and so does its pool. Build one per loop.

## Supplying your own transport

The transport is a `Protocol` — a structural interface, not a base class. The sync one requires
`send(request) -> HttpResponse` and `close()`; the async one `send` and `aclose()`. There is one
request seam whatever the operation returns, a file included, so a transport that implements those
two satisfies the Protocol under `mypy --strict`:

```python
client = {Api}Client(custom_http_client=MyTransport(), {scheme}=...)
```

This is the seam for **logging, tracing, metrics and tests** — the SDK ships no logging or middleware of
its own. Wrap the SDK's own transport rather than reimplementing HTTP:

```python
class LoggingTransport:
    def __init__(self, inner): self._inner = inner

    def send(self, request):
        # The head only: the body is still on the socket, and the caller closes it.
        response = self._inner.send(request)
        log.info("%s %s -> %s", request.method, request.url, response.status_code)
        return response

    def close(self): self._inner.close()
```

`send` returns an `HttpResponse` — `url`, `status_code`, lowercased `headers`,
`iter_bytes(chunk_size)`, `read()` and `close()` — whose body has **not** been read. That is true of
every response, not just a download, so a wrapper must hand each one back unread; logging its size
means consuming it, which leaves the caller nothing to read. `iter_bytes(None)` must yield each chunk
as the network delivered it, holding nothing back — an event stream reads it that way, and a wrapper
that re-chunks to a fixed size delays every small event.

Four obligations the protocol places on anything you supply, all silent when broken: **do not mutate
the incoming request** (it is frozen); **honour `request.timeout`** when set, falling back to your own
when it is `None`; **lowercase the response header names**, because callers look them up that way; and
**return once the head has arrived**, leaving the body for whoever reads it.

Two consequences. First, **the `timeout=` you passed to the client no longer reaches the wire** — that
value only builds the client's *own default* transport, so set the timeout on the one you pass or you
have silently reverted to the underlying library's default. The per-call
`request_options={"timeout": ...}` is the exception: it travels on the request object and reaches any
transport honouring the obligation above. Second, **the client still closes it** — don't close it
yourself while the client is alive, and don't share one transport between two clients.

## Next

- Configure authentication → **python-authentication**
- Make your first call → **python-calling-endpoints**
- Tune timeouts, retries, base URLs, proxies → **python-configuration-resilience**



<!-- Source: .agents/skills/python-authentication/SKILL.md; MIT; original SHA-256 8dded69966b0758fec809595403664361b28a0e6b7dadf2c5fc3f48bfe958b29 -->

---
name: python-authentication
description: Authentication for an APIMatic-generated Python SDK — supplying credentials in typed or dict form, the scheme shapes, the managed OAuth2 token lifecycle and its caching, what a failed token fetch actually raises (and why it bypasses the non-raising response mode), and loading secrets safely. Load before wiring credentials into the client, or when a call fails with 401/403.
---

# Authenticating an APIMatic Python SDK client

How you authenticate depends on the security scheme(s) the API uses. APIMatic surfaces each scheme as a
**keyword-only argument on the client constructor**, taking either a typed credentials model or a plain
dict of the same keys; set the one(s) your API uses, then construct the client (see
`python-client-initialization`).

> Throughout this skill, `{...}` is a placeholder for a name you take from your SDK (e.g.
> `{root_package}`, `{Client}`, `{oauth2}`) — replace it with the concrete identifier from the source.

To see which schemes a specific SDK accepts, read the **credentials keywords on its client
constructor** — those are the source of truth (take them from the contract sheet, grounded in the SDK
map's constructor-keyword table and its *Servers & auth* section, not from recall).
`{root_package}/auth.py` is the cheap cross-check:
its `AuthSchemes` holder carries exactly one field per declared scheme, and the field names *are* the
constructor keywords. The `{root_package}/core/auth/schemes/` directory ships *every* scheme the
generator supports as shared runtime code regardless of what the API accepts, so never infer a scheme
from that directory. (An SDK whose API uses only OAuth2 client credentials, for instance, exposes a
single `{oauth2}=` keyword and its `{oauth2}_token_source=` override.)

The credential classes below live under `{root_package}.core` and are the **same across all APIMatic
Python SDKs**; only the **keyword names** are generated per-API — each is the security scheme's id from
the spec, snake_cased (hence the `{...}` placeholders).

## The two spellings

Every credential keyword accepts a typed model or a mapping, and they are exactly equivalent — a
`coerce` classmethod is the single place the dict form is resolved, so the two cannot produce different
requests:

```python
from {root_package}.core import ClientCredentials

client = {Client}({oauth2}=ClientCredentials(client_id=cid, client_secret=secret))
client = {Client}({oauth2}={"client_id": cid, "client_secret": secret})
```

Prefer the typed form in application code — it is what your type checker can verify. The dict form is
for config-driven construction, where the keys arrive from a settings object.

Credential models are frozen with **`extra="forbid"`**, so the dict form is checked properly: a
misspelled or unexpected key raises `pydantic.ValidationError` at construction rather than being
silently dropped. `ValidationError` subclasses `ValueError`, so an existing `except ValueError`
around your startup path already catches it.

## Basic auth

```python
from {root_package}.core import BasicAuthCredentials

client = {Client}({basic_auth}=BasicAuthCredentials(username="...", password="..."))
```

Sends `Authorization: Basic base64(username:password)`. A `:` in the username is rejected at
construction — RFC 7617 encodes `user-id:password`, so a colon in the user-id cannot be decoded
unambiguously — which surfaces as a `ValidationError` instead of a header the server misreads.

## Bearer token

The constructor keyword takes the token **as a plain string**, not a model:

```python
client = {Client}({bearer_auth}="ACCESS_TOKEN")
```

Sends `Authorization: Bearer ACCESS_TOKEN`. An `openIdConnect` scheme reaches the SDK the same way —
its discovery document says how a token is obtained, not how it is sent.

## API key (header, query, or cookie)

The key is sent as a header, query parameter, or cookie — its placement and name are fixed by the
generated scheme. Set the configured key keyword to your key string:

```python
client = {Client}({api_key}="API_KEY")
```

A query-placed key is percent-encoded exactly as an endpoint's own query parameter; a cookie-placed key
is sent verbatim, because RFC 6265's `cookie-value` alphabet already admits every character a base64
key uses and encoding it would corrupt the credential.

> **Applies only when the SDK declares an OAuth2 scheme.** The next five sections — the three grants,
> the managed token lifecycle, and the token-fetch failure mode — describe machinery that exists only
> if the map's *Servers & auth* section lists an OAuth2 scheme. Where it lists none, skip ahead to
> *Combined / multiple schemes*; nothing below can occur in that SDK.

## OAuth 2.0 — client credentials (machine-to-machine)

```python
from {root_package}.core import ClientCredentials

client = {Client}({oauth2}=ClientCredentials(
    client_id="...",
    client_secret="...",
    scopes=["a", "b"],          # optional
))
```

`scopes` is a **list**, and the SDK joins it with the space delimiter RFC 6749 §3.3 requires — never
pre-join it yourself, or you send one scope literally named `"a b"`. Omit it to get whatever the
client's default scopes are.

When the flow declares a scope vocabulary, the generator emits a `Literal` alias for it in
`{root_package}/auth.py` (`{Flow}Scope`) and types `scopes` by that alias — so a scope the flow does not
document fails the type check at the call site instead of the request at the provider. A flow that
declares no scopes has no alias, and `scopes` is a plain `list[str] | None`.

## OAuth 2.0 — authorization code (3-legged, with PKCE)

```python
from {root_package}.core import AuthorizationCodeCredentials

client = {Client}({oauth2}=AuthorizationCodeCredentials(
    client_id="...",
    client_secret="...",                        # optional; needed only when PKCE is disabled (pkce=None)
    redirect_uri="https://app.example.com/callback",
    scopes=["a"],                               # optional
    state="...",                                # optional CSRF token
    pkce="S256",                                # default; RFC 7636 ("plain" where §7.2 permits it)
    prompt_for_authorization_code=get_code_from_user,
))
```

`prompt_for_authorization_code` is **required** and takes the fully built authorization URL, returning
the `code` your redirect endpoint received:

```python
def get_code_from_user(authorization_url: str) -> str:
    # Open/redirect the browser to authorization_url, then return the authorization code.
    ...
```

The SDK exchanges that code for a token and refreshes it when it expires; if the refresh is refused, it
calls the prompt again to re-authorize. Four things the signature does not show:

- **`state` is pass-through only.** It is sent on the authorization request and never generated or
  validated here — the SDK never sees the redirect, so producing and verifying it are yours alone.
- **`pkce=None` disables PKCE and then requires `client_secret`** — the combination that has neither is
  refused at construction, not at the first request.
- **The async client takes `AsyncAuthorizationCodeCredentials`**, whose prompt is a coroutine
  (`(str) -> Awaitable[str]`). Handing it a synchronous prompt is a *type* error rather than an event
  loop discovered blocked on a human in production.
- **The prompt runs inside the scheme's lock**, so it must not itself make a call that uses this scheme.

## OAuth 2.0 — resource owner password

```python
from {root_package}.core import PasswordCredentials

client = {Client}({oauth2}=PasswordCredentials(
    client_id="...",
    client_secret="...",        # optional; a public client sends client_id in the form body instead
    username="...",
    password="...",
    scopes=["a"],               # optional
))
```

## The managed token lifecycle (all OAuth2 grants)

You never request a token yourself. Set the credentials and the SDK does the rest — but *when* it does
is the part that matters:

- **The token is fetched lazily, on the first authenticated call** — not at construction. A client built
  with bad credentials constructs perfectly happily; the failure surfaces at the first operation.
- The fetch is a `POST` to the token endpoint derived from the client's `base_url`, form-encoded, with
  the client id and secret sent per the placement the spec declares — commonly HTTP Basic
  (`client_secret_basic`, both halves percent-encoded before base64), otherwise in the form body
  (`client_secret_post`).
- The resulting token is **cached in memory on the client's auth scheme** and reused across calls, which
  is the whole reason a client must be long-lived (`python-client-initialization`). The cache is
  double-checked under a lock, so a burst of concurrent first calls pays for **one** fetch.
- A token with an `expires_in` is renewed ~30s before expiry (or at half its lifetime, whichever leaves
  more time, for tokens shorter than a minute). Without an `expires_in` there is no client-side deadline
  and the token is used until the server rejects it.
- **Refreshing applies only to the authorization-code grant**, whose scheme prefers a refresh over a
  re-acquisition — a re-acquisition would run your prompt again. Client-credentials and password
  re-acquire instead (RFC 6749 §4.4.3 says the client-credentials grant SHOULD NOT be issued a refresh
  token), so the password grant re-sends the resource owner's password at every expiry.
- **On a `401`, the cached token is invalidated** so the next call re-authenticates — but **the failing
  request is not retried**. This is deliberate: the caller sees one `401` and then recovery. Do not
  write a retry loop *just* for this; do expect that a revoked credential surfaces as exactly one
  failed call.

### Overriding token acquisition

Each OAuth grant's credential keyword is joined by `{oauth2}_token_source=`, which replaces how the
token is obtained — for a token broker, a sidecar, a pre-issued token, or a test double. It takes
anything satisfying the token-source protocol: `TokenSource` (`fetch(credentials) -> OAuthToken`),
`AsyncTokenSource` on the async client, and `RefreshableTokenSource` / `AsyncRefreshableTokenSource`
(`fetch` plus `refresh`) for the authorization-code grant. Use it rather than reaching into the
scheme's cache, which is private. Your source **must not issue a request that itself uses this scheme**
— it runs inside that scheme's lock and would deadlock.

## The failure mode that surprises everyone

**A failed token fetch raises the SDK's ordinary API exception — but its payload is a different type
than any operation's.** For a managed-OAuth SDK, the token endpoint's error body is fixed by
RFC 6749 §5.2, so the SDK decodes it into an `OAuthProviderError` (`error`, `error_description`,
`error_uri`) — or a `RawError` if the provider's body does not conform.

Two consequences, and both are the sort of thing that costs an afternoon:

1. **The exception surfaces out of your *operation* call**, because that is where the lazy fetch
   happens. A traceback for bad credentials points at the operation you called, and the frames
   underneath name the token source. Reading only the top frame sends you looking in the wrong place
   entirely.
2. **The non-raising response mode does not protect you.** The `with_raw_response` variant returns a
   result object instead of raising *for the operation* — but the token fetch passes its own result
   through `unwrap()` internally, so an auth failure raises even there. Any code path that touches the SDK needs to handle
   this, including one written specifically to avoid exceptions.

So a boundary that catches only the operation's error union is incomplete. Narrow on the payload type:

```python
from {root_package}.core import ApiError, OAuthProviderError, RawError

try:
    result = client.{controller}.{operation}(body)
except ApiError as e:
    if isinstance(e.error, OAuthProviderError):
        # Credentials/token problem — no operation request was ever sent.
        log.error("auth failed: %s (%s)", e.error.error, e.error.error_description)
        raise ConfigurationError("API credentials rejected") from e
    ...  # the operation's own error union
```

Treat this as a **configuration** failure, distinct from an operation rejection: nothing was attempted,
so retrying it or reporting it as a failed operation are both wrong. `python-error-handling` has the
full catch ladder.

## Combined / multiple schemes

When an operation (or the whole API) requires more than one scheme, APIMatic composes them per
operation — OpenAPI's OR-of-ANDs, arm by arm — and the generated client wires the composition for you.
You configure it by setting the relevant credentials keywords:

- **AND** (`AllSchemes`) — every *configured* member applies to the request.
- **OR** (`AnySchemes`) — the first *configured* member applies. Selection is on **credential presence**,
  never on "applying it did not fail", so an unconfigured member listed first cannot win and send the
  request unauthenticated.

**This layer never withholds a request over a missing credential, and never raises for one.** An
unconfigured member simply drops out and the request goes out with whatever *was* configured; with
nothing configured at all it goes out unauthenticated. The server decides. Because composition is
per-operation, one client may authenticate different operations with different schemes — set every
keyword the operations your integration calls actually need.

## No auth

Some endpoints/APIs need no credentials — an operation declaring no `security` sends none. Leave the
credentials keywords unset.

## Loading secrets

Keep credentials out of source and out of logs.

```python
import os

client_id = os.environ["{API}_CLIENT_ID"]          # KeyError names the missing var
client_secret = os.environ["{API}_CLIENT_SECRET"]
```

Prefer `os.environ[...]` over `os.getenv(...)` at startup: `getenv` returns `None`, which then travels
into the credential model and fails later with a message about validation rather than about your
deployment. If you want a friendlier message, check explicitly and fail fast — an obviously-missing
credential should never reach the first API call.

For anything larger than a script, read secrets through the project's existing settings layer
(`pydantic-settings`, `django.conf.settings`, a secret manager client) rather than reaching for
`os.environ` in the middle of a module.

Two things that help, both already built in:

- **Secrets are hidden in reprs.** The secret fields on credential models are declared `repr=False`,
  so logging a credential object or an SDK object that holds one does not print the secret. Do not
  rely on this for values you assemble yourself.
- **Never log a credential's `model_dump()`** — that *does* include the secret. The repr protection is
  on the repr only.

## Notes

- A given SDK only exposes the credentials keywords for the schemes its API uses; those names are
  generated per-API (hence the `{...}` placeholders above).
- **Omitting a credentials keyword is legal and silent.** The client is then built with a no-auth
  scheme and requests go out unauthenticated. Nothing warns you at construction. Most APIs then
  answer `401`; an API that serves anonymous traffic at all (public endpoints, or a reduced rate
  limit for keyless callers) answers `200` and hides the omission entirely — so verify the keyword is
  actually set rather than waiting for a `401` to tell you, and if you *are* getting blanket `401`s,
  check that before suspecting the credentials themselves.
- Set credentials **at construction**. The scheme is built there; assigning to a private attribute
  afterwards is not supported. To rotate a credential, build a new client and close the old one.
- Rotation with a long-lived client: the token cache is per client instance, so swapping in a new
  client atomically (build, then replace the reference, then close the old one) rotates without a
  window where calls have no credential.
- A per-call `extra_headers` outranks the credential: header precedence is API-wide → the endpoint's
  own → auth → `extra_headers`. That is the deliberate way to override an `Authorization` header — or
  blank it for a call meant to go out anonymous — and also the way to break auth by accident.



<!-- Source: .agents/skills/python-configuration-resilience/SKILL.md; MIT; original SHA-256 44a0c889e6b65562d29aa37a135b0173267193493526b535f47f0848668fc266 -->

---
name: python-configuration-resilience
description: Client configuration and resilience for an APIMatic-generated Python SDK — server and base-URL selection, the retry policy (on by default, off with `max_retries=0`) and what it will and will not repeat, what a timeout actually bounds, proxies and TLS, and request/response logging through the transport seam. Load before you configure or tune the client — the keyword names alone do not reveal what is handled for you and what is not.
---

# Configuration & resilience for an APIMatic Python SDK

> Throughout this skill, `{...}` is a placeholder for a name you take from your SDK (e.g. `{Api}Client`,
> `{group}`, `{root_package}`) — replace it with the concrete identifier from the source.

Configuration is not an options object here. Everything is either a **constructor keyword** on the
client (`python-client-initialization`), a field on a **config model** — the server config or
`RetryOptions` — or a **per-call `request_options`**. There is no third place to look.

## What this SDK does not do for you

Read this before designing around a capability you assume exists. The generator emits **none** of the
following, so each is yours to build or deliberately do without:

| Capability | Status | What to do instead |
|---|---|---|
| **Streaming — file responses** | a `FileResponse` arrives with its body unread and holds its connection until you consume it | `save_to` / `read` / `iter_bytes` (see `python-file-handling`) |
| **Streaming — SSE** | an `EventStream` arrives with its body unread; iterating yields each event's decoded data, and `timeout` bounds the gap between events | a `for` loop, or `with` for an early exit (see `python-event-streams`) |
| **Request/response logging** | none — no hook, no event | Wrap the transport; see below |
| **Circuit breaking, rate limiting** | none | Your own, around the call |
| **A mock/offline mode** | none | Point `base_url` at a mock server, or supply a fake transport (`python-testing`) |

**Retries are on by default.** A client built without `retry_options` retries idempotent calls up to
three times; set `max_retries` to `0` to turn that off — see *Retries* below.

What the SDK *does* own: the request pipeline, auth application and token caching, response decoding,
error mapping, connection pooling, one timeout, and — once you turn it on — the retry loop.

## Server and base-URL configuration

Server selection is **not** an environment enum. What the constructor accepts depends on what the
description declares, in one of four shapes — take yours from the contract sheet, grounded in the SDK
map's *Servers & auth* section, which names the environments and servers this SDK declares and so
settles which arm it is:

| The API declares | Constructor keywords |
|---|---|
| one server, one environment | `base_url: str \| None = None` |
| one server, several environments | `environment` (a string literal alias with a default), then `base_url` |
| several servers, one environment | `server_config: {Server}ConfigOrDict \| None = None` |
| several servers, several environments | `environment`, then `timeout`, then `server_config` |

```python
client = {Api}Client(base_url="https://api.example.com", {scheme}=...)   # base-url arms
client = {Api}Client(server_config={"{server}": {"base_url": "..."}}, {scheme}=...)   # several servers, ONE environment
client = {Api}Client(environment="production", server_config={"{server}": {"production": {"base_url": "..."}}}, {scheme}=...)   # several servers, SEVERAL environments
```

**The two `server_config` arms nest differently, and every config model is `extra="forbid"`, so the
wrong nesting raises `ValidationError` rather than being ignored.** With one environment each server's
field holds `base_url` directly. With several, each server's field holds **one field per environment**
and the `base_url` sits inside the environment's variant — passing `{"{server}": {"base_url": ...}}`
there fails with `Extra inputs are not permitted`. Take the nesting from the SDK map's *Servers & auth*
section rather than from this shape.

Either way `server_config` is a pydantic model with a dict companion, coerced through `.coerce()`,
holding **one field per server the API declares**. Template variables sit beside `base_url` at
whichever level carries it.

**Omitting the server keyword takes the description's own default, and that default is whatever the
spec listed first — for many providers a sandbox.** Nothing announces it. A deployment that believes it
configured production and did not gets sandbox behaviour with production credentials, which fails auth
in a way that looks like a credentials problem, not an environment one. Pass the server explicitly in
every environment, production included.

**Server template variables are only reachable in the `server_config` arms.** They are fields on the
config class, so where the constructor takes a `server_config` you set them there. Where it takes a
`base_url`, the client builds the config itself — there is no path to a variable, and your only lever
is replacing the whole URL with `base_url`. Variables always carry a declared default (a constant or an
enum member), so a call still works untouched; it just goes wherever the default points.

Resolve the environment from configuration with an explicit map and **fail on an unknown value** rather
than falling through to a default:

```python
BASE_URLS = {"sandbox": "https://sandbox.example.com", "live": "https://api.example.com"}
base_url = BASE_URLS[settings.environment]     # KeyError beats a silently wrong environment
```

Where the SDK manages OAuth, **the token endpoint is derived from the same server**, so environment and
auth can never drift apart. Pointing `base_url` at a mock server or recording proxy therefore redirects
the token fetch too.

## Retries — on by default

A client built without `retry_options` uses the **default policy** in the table below: a `GET`, `HEAD`,
`PUT` or `OPTIONS` call that meets a `408`, `429`, `500`, `502`, `503`, `504` or a dropped connection is
retried up to three times.
Retrying is configured by one options class, `RetryOptions` (from `{root_package}.core`), passed to the
client in any of four spellings:

```python
from {root_package}.core import HttpMethod, RetryOptions

client = {Api}Client(retry_options=3, {scheme}=...)                  # a count: max_retries=3, every other field at its default
client = {Api}Client(retry_options={}, {scheme}=...)                 # every field at its default, as omitting it does
client = {Api}Client(retry_options={"max_retries": 5}, {scheme}=...)  # a dict: the fields you name, the rest at their defaults
methods: frozenset[HttpMethod] = frozenset({"GET"})                  # held in a variable: annotate it
client = {Api}Client(
    retry_options=RetryOptions(max_retries=5, http_methods_to_retry=methods),
    {scheme}=...,
)                                                                    # the model itself
```

**Turning retries off** is `max_retries` set to `0`, in whichever spelling: `retry_options=0`,
`{"max_retries": 0}` or `RetryOptions(max_retries=0)`. Leaving `retry_options` out, or passing `None`,
`{}` or `RetryOptions()`, all give the **default policy** — none of them turns retrying off.

`RetryOptions` is a frozen pydantic model and its dict companion is a closed `TypedDict`, so a misspelt
key or an out-of-range value (a negative count, a `backoff_factor` below `1`) raises `ValidationError`
at construction rather than being ignored.

| Field | Default | Meaning |
|---|---|---|
| `max_retries` | `3` | Retries *after* the first attempt; `0` disables |
| `initial_delay` | `1.0` | Seconds before the first retry |
| `backoff_factor` | `2.0` | Multiplier per retry; `1` keeps the delay constant |
| `max_delay` | `60.0` | Ceiling on any one wait, a `Retry-After` included |
| `max_jitter` | `0.5` | Widest random addition to a wait, in seconds; `0` removes it |
| `status_codes_to_retry` | `frozenset({408, 429, 500, 502, 503, 504})` | Statuses that qualify |
| `http_methods_to_retry` | `frozenset({"GET", "HEAD", "PUT", "OPTIONS"})` | Methods that may be repeated at all |

The wait before retry *n* (from 0) is `min(initial_delay × backoff_factor ** n + jitter, max_delay)`,
or the server's `Retry-After` — seconds or an HTTP date — capped at `max_delay` when it sends one.

A call is repeated only when **all** of these hold:

- its method is in `http_methods_to_retry` — this gates dropped connections and timeouts as well as
  statuses, so the default never repeats a `POST`, `PATCH` or `DELETE`;
- it failed with a status in `status_codes_to_retry`, or with no response at all;
- its body can be sent again — `bytes`, a `Path`, JSON, form and text bodies can; a binary body or a
  multipart file read from an open stream cannot;
- retries remain.

A `401` is never in the default set; it invalidates the cached credential for the next call instead
(`python-authentication`). Whatever you add to `status_codes_to_retry` is retried, so leave out
statuses that cannot succeed a second time. When the last attempt fails, you see what a single attempt
would give you: the `ApiError`, the raw response's `Failure`, or the HTTP library's own exception.

A **custom transport** must raise `TransportError` (`from {root_package}.core import TransportError`)
for a failed send to be retried; the shipped `Httpx2Client` does. Anything else it raises reaches you on
the first attempt.

### Per-call overrides

`request_options` overrides two fields for one call; the rest stay the client's:

```python
client.{group}.{operation}(arg, request_options={"max_retries": 0})                     # this call: no retries
client.{group}.{operation}(arg, request_options={"status_codes_to_retry": frozenset({429, 503})})  # this call: a narrower set
```

**Do not wrap the call in a second retry layer** (`tenacity`, a loop of your own): attempts multiply,
and each of your attempts is a new call with a new idempotency key (below). If you need behaviour the
options cannot express, turn the SDK's off for that call and own it.

**Only a write that was sent may have landed.** A write that timed out *after it was sent* may have
succeeded — a reset after the bytes reached the server is indistinguishable from one before. A write
that was never sent did not happen; `python-error-handling` names the four exceptions that mean so.

**The retry arithmetic is not a ceiling.** `(max_retries + 1) × timeout` plus the waits between them
can be exceeded, because one attempt can outlast its timeout; see *Bounding a call*.

### Making a write safe when you retry

**Every operation other than a `GET` sends an `Idempotency-Key` header** — a UUID minted once per call,
unless the description declares its own header of that name, in which case that one is a keyword you
set. Within the SDK's retry loop every attempt carries the *same* key, which is what makes adding `POST`
to `http_methods_to_retry` safe **where the provider deduplicates on it**. A retry you write yourself is
a new call and mints a new key — the provider sees two submissions.

Where the operation declares the parameter itself, derive the key from what the request is for, and
reuse it on every attempt and every repeat:

```python
request_id = derive_ref(request)                     # the same on every attempt and every repeat — never uuid4()
client.{group}.{operation}(body, {idempotency_key}=request_id)
```

Two things the signature will not tell you, both of which need the provider's own documentation:

- **Whether the provider actually enforces it.** The header being sent is not a guarantee that a
  resend is deduplicated.
- **The retention window.** Keys expire, and windows differ per API — so a resend after a long backoff
  may no longer be collapsed.

**Where the provider ignores the key, retrying a write is a real duplication risk.** Keep `POST` out
of the gate; the safe recovery is to re-read state and decide, not to resend. Some such operations are
naturally idempotent (cancelling an already-cancelled resource is usually harmless), but that is a
per-operation judgement — make it deliberately rather than retrying the whole class.

### ⚠⚠ The same operation arriving twice

Everything above stops one call being *sent* twice. It does not stop one operation being *requested*
twice — a double-submit, a caller retry, a redelivered message, two workers racing. The SDK's own
`Idempotency-Key` does not help here: it is new on every call. Stopping it needs a claim that outlives
the request and the process, taken atomically:

```python
ref = derive_ref(request)                  # from what the request is for — never uuid4()
if not try_claim(ref):                     # insert-or-fail: the store rejects the second claim, you catch it
    return load_existing(ref)              # may still be in progress — do not report it done
result = client.{group}.{operation}(...)   # `ref` as its idempotency key, if the operation declares one
complete(ref, result)
```

Build `try_claim` on whatever this codebase already uses to enforce uniqueness, and add no new store or
dependency for it. If it has nothing that can hold such a claim, stop and raise that with the user.

⚠⚠ An in-process lock (`threading.Lock`, `asyncio.Lock`, a module-level dict), a single-process or
single-host assumption or an exists-then-create read is no guard here: it lets both callers through —
and documenting it as a known limitation does not change that.

## Bounding a call — what the timeout actually bounds

One knob, in two places — and, for async code, a limit on the whole call:

```python
client = {Api}Client(timeout=10.0, {scheme}=...)                    # each wait, every request
client.{group}.{operation}(arg, request_options={"timeout": 3.0})   # each wait, this one request
await asyncio.wait_for(async_client.{group}.{operation}(arg), budget)   # the whole call (Async{Api}Client)
```

- The value is **seconds, as a float**; the per-call option overrides the client's.
- It must be **> 0**. The constructor raises `ValueError` otherwise — and rejects NaN too, since the
  guard is written `not timeout > 0`.
- The default is **30 seconds** per wait.
- Under the default transport, one float sets connect, read, write and pool timeouts alike. To separate
  them (a short connect, a longer read), build your own transport with an
  `httpx2.Timeout(connect=..., read=...)` and pass it as `custom_http_client`.

**The timeout limits each wait, not the whole call.** Connecting, sending and receiving each have their
own clock, and the receiving clock starts again every time a piece of the reply arrives. So a reply that
keeps arriving slowly is never cut off, and each attempt — up to `max_retries + 1` of them — can take far
longer than the number you set. This timeout firing is a transport failure and retries on the curve
like any other; a `408` is the server's request timeout and sits in the default status set.

**If you supply `custom_http_client`, the client's `timeout=` no longer reaches the wire.** That value
only builds the SDK's *own* default transport. Set the timeout on the transport you pass, and honour
`request.timeout` inside it (`python-client-initialization`).

To limit a whole call, retries included, async code wraps it in `asyncio.wait_for(...)`
(`asyncio.timeout(...)` needs 3.11, and this SDK supports 3.10); map its `asyncio.TimeoutError` as
`python-error-handling` shows. Sync code has no whole-call limit through this SDK. A file or
event-stream call returns at the head, so put the limit around the consuming code too.

## Proxies and TLS

The default transport takes these directly, and you pass it in yourself to set them:

```python
from {root_package}.core import Httpx2Client

transport = Httpx2Client(timeout=10.0, proxy_url="http://proxy:3128", verify=True)
client = {Api}Client(custom_http_client=transport, {scheme}=...)
```

- `verify` accepts a bool **or an `ssl.SSLContext`**. A private CA bundle or a client certificate is
  configured by building a context (`ssl.create_default_context(cafile=...)`) — that is the supported
  spelling for either.
- **Standard environment variables are honoured by default**: `HTTP_PROXY` / `HTTPS_PROXY` /
  `ALL_PROXY` / `NO_PROXY` (consulted only when `proxy_url` is unset), and `SSL_CERT_FILE` /
  `SSL_CERT_DIR` for the trust store. This is request behaviour your deployment can change without
  touching code — worth knowing when a container behaves differently from a laptop. A caller who needs
  it off supplies their own transport.
- **`verify=False` disables certificate verification.** It is not a debugging convenience for anything
  carrying credentials; fix the trust store instead.

## Logging — wrap the transport

There is no logging hook and no event to subscribe to. The transport protocol is the seam: implement
it, delegate to the real one, and log around the call.

```python
import logging, time
from {root_package}.core import Httpx2Client

log = logging.getLogger(__name__)

class LoggingTransport:
    def __init__(self, inner): self._inner = inner

    def send(self, request):
        started = time.monotonic()
        # The head only -- do not read the body here; the caller owns it.
        response = self._inner.send(request)
        log.info(
            "%s %s -> %s (%.0f ms)",
            request.method, request.url, response.status_code,
            (time.monotonic() - started) * 1000,
        )
        return response

    def close(self): self._inner.close()

client = {Api}Client(
    custom_http_client=LoggingTransport(Httpx2Client(timeout=10.0)), {scheme}=...
)
```

The async version is the same shape with `async def send` and `async def aclose`. Both members are
required, and they are the only two: one request seam serves every operation, a download included,
so there is no second method to forget.

**The elapsed time above bounds the head, not the call.** `send` returns once the response head has
arrived, so a body still on the wire is not in that measurement — for a download it is barely in it
at all. Timing the whole exchange means timing where the body is consumed, which is the caller's
code, not this wrapper.

**Log the method, URL and status — not headers or bodies.** The auth header carries a live credential
and bodies carry whatever the API moves; neither belongs in your logs or your traces. If you must
capture a body to debug, gate it behind a flag that is off by default and redact before writing.

This same wrapper is where OpenTelemetry spans, metrics and request-id propagation belong.

### Verify on the wire (first run of any new call)

On success the SDK returns the decoded body and nothing else — never the URL or status. So a wrong path
parameter, a header you thought you set, or a query parameter that silently did not serialize produces
**no in-band signal**; the only symptom is a `404`/`422` that looks like a provider problem.

Run the logging transport the first time you execute any new call, and check:

1. the **method** matches the operation;
2. the **path** has no unsubstituted `{placeholder}`;
3. path segments carry **wire values** — an enum's string, not a Python member name;
4. the **query parameters** you set actually appear.

Then gate the wrapper behind a debug flag.

## Connection pooling

The client holds one pooled transport. Reuse the client and close it on shutdown; a client per call
pays a fresh TCP and TLS handshake every time, and under managed auth a fresh token fetch as well.
Under forking servers (Gunicorn, uWSGI, Celery prefork), construct it **after** the fork — a pool
inherited across `fork()` is shared by processes that each believe they own it, which surfaces as
intermittent, unexplainable connection errors. See `python-client-initialization`.

## Next

- Where the client should live → **python-client-initialization**
- Which exceptions reach your boundary → **python-error-handling**
- Faking the transport in tests → **python-testing**



<!-- Source: .agents/skills/python-calling-endpoints/SKILL.md; MIT; original SHA-256 2dab405e3e398e350c030444970882a6391fc53f288dfdfc421646e116d083e3 -->

---
name: python-calling-endpoints
description: Calling operations on an APIMatic-generated Python SDK — finding the group that owns an operation, the positional/keyword-only split and the parameters that never appear in the signature at all, passing a body as a model or a dict, uploading a file or a raw binary body, the two response modes, consuming a streamed file response, consuming an event stream, per-call request options, and async usage. Load before writing the first call to an SDK operation, or when an operation's shape or return type is unclear.
---

# Calling endpoints on an APIMatic Python SDK

Operations are methods on **group accessors** of the client, named in `snake_case`:
`client.{group}.{operation}(...)`. An operation that belongs to no group sits **directly on the
client**, called `client.{operation}(...)`. The accessor, the exact operation name and its signature
come from the contract sheet, grounded in the SDK map's per-controller page
(`map/operations/{group}.md`), whose block for each operation is headed by its full accessor path and
carries the signature verbatim — operation names follow no fixed verb/resource pattern, so take the
real name from the sheet, never from memory.

> Throughout this skill, `{...}` is a placeholder for a name you take from your SDK (e.g. `{group}`,
> `{operation}`, `{Model}`) — replace it with the concrete identifier from the source.

## Method signature convention

Every endpoint lays its parameters out in the same fixed shape:

```python
def {operation}(
    self,
    {required params},                  # path, then query, then header, then body — in that order
    *,
    {optional params} = {default},      # same source order
    request_options = None,             # always the last slot
) -> {ReturnType}: ...
```

Everything after `*` is keyword-only and **every one of them has a real default**, so there is no
parameter you must pass `None` to just to reach a later one. Omit what you do not need; spelling out
`some_header=None, some_filter=None` is noise that hides the parameters you meant to set.

### Where a parameter lands — the rule

Each parameter the description declares produces **one of three** outcomes, and the third one catches
people out:

| What the description declares | What you get |
|---|---|
| **required**, no fixed value | a **positional** parameter, no default |
| **optional** | a **keyword-only** parameter defaulting to `None` |
| a **default value** | a **keyword-only** parameter defaulting to *that value* — even if the parameter is required |
| a **constant** value | **no parameter at all** — the value is baked into the request and you cannot change it |

Two consequences worth stating on the contract sheet:

- **"Required" does not mean "path".** Positional parameters are ordered **path → query → header →
  body**, so a required *query* or *header* parameter is positional too, sitting between the path
  parameters and the body. Take the boundary from the sheet; never infer it from the URL.
- **A parameter with a declared default is keyword-only whatever its optionality**, and the SDK sends
  that default on every call you don't override.

### Non-`None` defaults silently narrow what comes back

This is the single most common wasted afternoon on a generated SDK. A parameter carrying a
spec-declared default is *always sent*, so the response you get is the one that default asked for —
not the full resource. Typical shapes:

- a representation/verbosity switch defaulting to the minimal form, so a create returns little more
  than an id, a status and some links;
- a field-selector defaulting to one section, so whole branches of the response are simply absent.

Read the sheet's default column **before** concluding the API dropped data. It was never requested.

## Passing a body

How the body appears depends on the media type the operation declares. The operation's map block
settles both: its **Params** bullet labels the body parameter with its media type (`body — JSON
body`), and its **Type sources** table names the module declaring the request model and its `…Dict`
companion.

**JSON** — one parameter, typed as a union of the model and its `TypedDict` companion, so both
spellings type-check:

```python
from {root_package}.models import {Model}

client.{group}.{operation}({Model}(field=...))    # model
client.{group}.{operation}({"field": ...})        # dict — companions nest too
```

Prefer models in application code: better inference, better errors, and required members are enforced
at construction. The dict form suits payloads assembled from external data. See `python-models`.

**Form and multipart** — there is **no single body parameter**. Each field (and each file) becomes its
own parameter, following the same three-way split rule above. Do not go looking for a `body=`; read the
signature. An optional part is omitted by leaving its parameter at its default: a part passed `None`
is dropped from the body rather than sent empty.

**Raw binary** — one parameter typed `FileInput` (`AsyncFileInput` on the async client), sent as the
whole body with no wrapper around it.

**A text body** — the parameter takes the schema's own type: a `str` for a text schema, and the upload
alias above for a binary one. It is sent as the body as it stands and handed back the same way, and
nothing is encoded or decoded for you — where an endpoint asks for base64, pass content that already is
base64 and decode a base64 response yourself. Arbitrary binary belongs in a raw-binary or multipart
position.

**No payload** — no body parameter at all.

**An optional-looking body is not permission to omit it.** A body typed `... | None = None` reflects
what the *description* marked optional, not what the endpoint needs. A create whose body is optional in
the spec will type-check with no arguments and then fail at the provider. Where a call obviously needs
a payload, pass one.

Serialization happens while the request is built, **before** anything is sent — so a body the SDK
cannot dump raises out of the call with no request made. See `python-models`.

### File and binary parameters

**One name per client, whichever position it is.** A multipart file part and a raw binary body take
the same alias, and only the client you called decides which: `FileInput` on the sync client,
`AsyncFileInput` on the async one, and `list[…]` of either for an array part. Both are imported from
`{root_package}.core`.

Nothing validates a file, so what the alias accepts is wider than the annotation shows — `bytes`, a
`Path`, any object with a binary `read`, a chunk iterator, and an `anyio`-style handle on the async
client. Which one you pass has consequences the signature cannot show: what stays resident, what can
be re-sent, who closes your handle, whether the body goes out sized or chunked, and what the file is
called on the wire. There is **no `str` arm** at either position — wrap a path in `Path`.

```python
from pathlib import Path

client.{group}.{operation}(Path("invoice.pdf"))    # the default: streams, sized, names itself
```

**Load `python-file-handling`** before passing anything other than a `Path`, and before consuming a
file an operation returns. It carries the arm-by-arm decision with its costs, the three behaviours
that differ between a part and a raw body, overriding the filename or media type, and how to read a
`FileResponse` without leaking its connection.


## Making the call and reading the response

Operations come in two forms, and choosing between them is a real design decision.

**Parsed (the default).** Returns the decoded payload directly — no envelope to unwrap. On a non-2xx it
raises `ApiError`:

```python
value = client.{group}.{operation}(...)
```

**Non-raising — `with_raw_response`.** Returns a result you branch on. Use it when you need the
**status code or response headers** (the parsed form exposes neither on success, except for a file
response, which carries its own `headers`), or when a non-2xx is
an expected outcome rather than an exception:

```python
from {root_package}.core import Success, Failure

match client.{group}.with_raw_response.{operation}(...):
    case Success(payload=value, status_code=status):
        print(status, value)
    case Failure(error=err, status_code=status):
        print(status, err)
```

Both are frozen dataclasses, so `match` needs no boilerplate and `isinstance` narrowing is equivalent.
`unwrap(result)` (from `{root_package}.core`) collapses either back to the payload — which is literally
how the parsed form is built: every parsed method is `unwrap(...)` around its raw peer.

**`with_raw_response` removes one exception path, not the need for a `try`.** Two failures still raise
in both modes: a failed token fetch (it unwraps internally), and any decode failure. See
`python-error-handling`.

### Return types

Five shapes, and the sheet names which one each operation has — the map block states it directly as
**Returns (parsed)** and **Returns (raw)**:

- **A decoded model** — the JSON case, and the common one.
- **Text** — a `str` or other scalar, for an operation declaring a text response.
- **A file** — `FileResponse` (`AsyncFileResponse` on the async client), for an operation declaring a
  binary response. Unlike the others it arrives **unread** and holds a connection; see below.
- **An event stream** — `EventStream[T]` (`AsyncEventStream[T]` on the async client), for an operation
  declaring a `text/event-stream` response. It arrives **unread**, holds a connection, and iterating
  it yields `T`; see below.
- **`None`** — the operation declares no response body.

**`-> None` means the call succeeded.** Do not bind it and do not test it — success is "no exception
raised", exactly as for the others. Two follow-ons: if you need the resulting state, re-read it with a
separate call; and if you need the status code (`200` vs `204`), the raw peer is `ApiResult[None, ...]`
and `Success(payload=None, status_code=...)` is the only place it appears.

Writing `value = client.{group}.{operation}(...)` on a `-> None` operation type-checks under a loose
annotation and then fails later with an `AttributeError` on `None`.

### Consuming a file response

A `FileResponse` is a body that has **not been read yet** and holds its connection until it is,
which makes it the one return value with a lifecycle. Three calls consume it and all three close it —
`save_to(...)`, `read()`, or a drained `iter_bytes()` under `with` — and the async twin mostly
`a`-prefixes them.

Getting this wrong leaks a connection rather than raising, so **load `python-file-handling`** before
writing the consuming code. It carries the lifecycle in full: which warning fires when one is
abandoned and how to make it fail a test, the single-use rule, what `save_to` does with a directory,
and why a `try` around the call alone catches nothing.

### Consuming an event stream

An `EventStream[T]` is iterated, not read: a drained `for` releases its connection, and any early exit
needs `with`. **Load `python-event-streams`** before writing the loop — it carries the lifecycle, the
union narrowing, and the failures that are silent.


## Per-call overrides — `request_options`

Every operation's last parameter is `request_options`, the SDK's single per-call override channel,
accepted typed or dict-shaped:

```python
client.{group}.{operation}(..., request_options={"timeout": 5.0})
```

The keys are exactly `timeout` (seconds, must be > 0), `extra_headers`, and the two retry overrides
`max_retries` and `status_codes_to_retry` (`python-configuration-resilience`). It is validated with
`extra="forbid"`, so `{"timeuot": 5}` raises `ValidationError` rather than being ignored — and because
the dict form is a closed `TypedDict`, a type checker catches it at the call site first.

`extra_headers` wins over both the API's and the endpoint's own headers, which makes it the deliberate
way to override a header the SDK sets — including blanking an auth header for a call meant to go out
anonymous. That precedence is a footgun as much as a feature: setting `authorization` here overrides
the managed token.

Two mechanics:

- **Header names are lowercased on the way out**, at every layer including yours, so the merge is
  genuinely case-insensitive and the request reaching the transport is keyed in lowercase. Look
  request headers up that way (`python-testing`).
- **`Cookie` folds instead of replacing.** Every other field takes the later layer and discards the
  earlier; a cookie you add joins the jar alongside whatever the endpoint or a credential put there
  (RFC 6265 permits one `Cookie` field). So a cookie-carried credential cannot be blanked with
  `extra_headers` the way a header-carried one can.

## Async

The async client's operations are identical in name and parameters — you await them. There is no
`_async` suffix and no separate method list; the client class you hold decides the flavour:

```python
value = await client.{group}.{operation}(...)

match await client.{group}.with_raw_response.{operation}(...):
    case Success(payload=value): ...
```

Do not mix the two clients in one call path (`python-client-initialization`).

To run independent calls concurrently — the main reason to choose the async client at all — gather
them, but bound the concurrency: `gather` over a long list opens as many simultaneous requests as the
list is long, against a provider that rate-limits.

```python
sem = asyncio.Semaphore(10)

async def one(arg):
    async with sem:
        return await client.{group}.{operation}(arg)

results = await asyncio.gather(*(one(a) for a in args))
```

## Timeouts and cancellation

There is no cancellation-token parameter. Python's own mechanisms apply:

- **Per call** — `request_options={"timeout": ...}`, which sets the limit on each wait for this one request.
- **The whole call** — `asyncio.wait_for(...)` around it, in async code; see
  `python-configuration-resilience`.
- **Sync code has no whole-call limit.** The timeout only limits each wait — set one anyway.

## Next

- Models, enums, `UNSET` → **python-models**
- Exceptions and error unions → **python-error-handling**
- Timeouts, base URLs, proxies, and **verifying a new call on the wire** →
  **python-configuration-resilience**



<!-- Source: .agents/skills/python-error-handling/SKILL.md; MIT; original SHA-256 14a6d85d08110b64a857cb6ab76ef3e4b38635331161e474b15abf7f802bcb89 -->

---
name: python-error-handling
description: Error and exception handling for an APIMatic-generated Python SDK — load before writing any try/except around an SDK call, an exception-translation layer, or error middleware. Covers the single ApiError type and its per-operation error union, narrowing with isinstance or match, the failures that are NOT ApiError and reach your boundary unmatched, and the traps that make an otherwise reasonable except ladder silently wrong.
---

# Error handling for an APIMatic Python SDK

> Throughout this skill, `{...}` is a placeholder for a name you take from your SDK (e.g.
> `{Operation}`, `{Group}`, `{root_package}`) — replace it with the concrete identifier from the
> source.

Operations **raise on non-2xx responses** by default (for a non-raising alternative, see the
**`with_raw_response`** section below). The raised type is always `ApiError` — there is exactly one
exception class in these SDKs, and the variation lives entirely in the payload it carries.

```python
from {root_package}.core import ApiError, RawError
```

`ApiError` is generic in its payload (`ApiError[E]`), but you catch it **unparametrized**. A runtime
`except` clause cannot discriminate a type parameter, so `except ApiError` catches every operation's
failure and you narrow on `e.error` afterwards. This is the opposite of a generator that encodes the
error type into the exception class: here the compiler-equivalent check happens at the `isinstance`,
not at the `except`.

## Catch the exception

`ApiError` carries three things:

| Attribute | Type | Notes |
|---|---|---|
| `e.error` | the operation's error union | The decoded body. **This is the information.** |
| `e.status_code` | `int` | The status that failed. |
| `e.headers` | `Mapping[str, str]` | The response head, keys lowercased. |

**`str(e)` and `repr(e)` deliberately omit the body.** They render as `HTTP 422: {TypedError}` — the
status and the payload's *type name* only, so response bodies stay out of logs and tracebacks by
default. That is a sound default and a trap: a handler that logs `str(e)` and nothing else records
that something failed and discards every diagnostic. Read `.error` explicitly and log the fields you
choose.

The status is **always** on `e.status_code`, whichever arm of the union you got — you never have to
choose between a typed body and knowing the status.

### Which error union does an operation carry?

Every operation's union is generated into its own module, `{root_package}/errors/{operation}_error.py`,
as a type alias:

```python
{Operation}ErrorBody: TypeAlias = {TypedError} | RawError
```

Four places give you that alias, in order of preference:

1. **The contract sheet** — it lists the union per operation.
2. **The operation's map block** (`map/operations/{group}.md`) — its **Error** line names the alias
   and its case, and its **Error arms** bullet lists each arm *with the HTTP statuses it maps from*.
   This is where the sheet's row should have come from.
3. **The operation's docstring**, whose `Raises:` section ends with the union verbatim:
   `` `error` is `{TypedError} | RawError`. ``
4. **The error module itself**, whose `map` is a `match` on `status_code` naming the schema each
   status decodes to.

**`RawError` is always the last arm.** The generator emits it unconditionally as the catch-all, so
every operation can hand you a `RawError` for any status it does not document — there is no operation
whose failure is guaranteed typed. An operation that documents *no* error schema has no error module
at all and always yields `RawError`.

### Narrowing the union

> **Applies only when the operation declares a typed arm (Case A).** An SDK whose map reports zero
> per-operation error unions, or an operation whose alias is `RawError` alone (Case B), has nothing to
> narrow — `e.error` is always `RawError` there. Skip to *Result-style alternative* for those.

**The typed arm is not one type across the API, and assuming it is is the mistake that costs the
afternoon.** A description that declares a different error schema per tag gets a different model per
tag, so a check written against one operation's arm silently fails on another's — those failures fall
through to the `RawError` branch and lose every field they actually carried. Take the arm from the
contract sheet per operation — the map's **Error arms** bullet is per-operation for exactly this
reason — never reuse one from a sibling call.

An operation can also declare **more than one** typed arm — one per documented status or status
*range* (`4XX`, `5XX` are legal), so a union may read `{TypedError1} | {TypedError2} | RawError`.
Handle each arm you declared.

Narrow with `match` or `isinstance` — a type checker understands both — on a class arm only; a `oneOf`
alias is not a class either, so match its variants. After narrowing the class arms, what remains is
the `Any`, `list[...]` or `dict[...]` body: branch on `e.status_code` there. `isinstance(e.error, Any)`
and `case Any()` raise `TypeError`, and mypy flags neither.

```python
from {root_package}.core import ApiError, RawError
from {root_package}.models import {TypedError}

try:
    result = client.{Group}.{Operation}(...)
except ApiError as e:
    match e.error:
        case {TypedError}() as err:
            log.warning("rejected: %s (%s)", err.{message_field}, e.status_code)
        case RawError() as raw:
            log.error("HTTP %s: %s", raw.status_code, raw.text())
```

Where your boundary treats every provider rejection alike and the API declares several typed arms,
group them into one tuple rather than writing a clause each — but only over members they **all**
declare as required:

```python
PROVIDER_ERRORS = ({TypedError1}, {TypedError2})     # all declare {message_field}

if isinstance(e.error, PROVIDER_ERRORS):
    ...
```

`RawError` exposes `status_code`, `content`, `text()` and `json()`. **`json()` raises `ValueError`
when the body is not JSON** — and a `RawError` body often is not, since it is by definition the
undocumented case — so prefer `text()` for logging unless you know better.

## Result-style alternative — `with_raw_response` (no raising)

Every operation has a raw peer reached through `with_raw_response`, which returns the outcome instead
of raising:

```python
from {root_package}.core import Success, Failure

match client.{Group}.with_raw_response.{Operation}(...):
    case Success(payload=value):
        ...
    case Failure(error=err):
        ...        # 'err' is the same union as the raising path
```

`Success` and `Failure` are frozen dataclasses, so pattern matching needs nothing added; both carry
`.status_code` and `.headers` as fields of their own. On the **success** path this mode is the only
way to read either — except for a file response, which carries its own `headers` on the parsed path.
On the failure path `ApiError` already carries both, so the choice there is about whether you want an
exception, not about what you can see. `unwrap(result)` (from `{root_package}.core`) collapses either
back to the raising behaviour — in fact every parsed method is literally `unwrap(...)` around its raw peer.

The split is mechanical: **2xx is `Success`, everything else is `Failure`.** No nuance, no per-status
judgement. Use this variant when you need the status code or headers on the *success* path, or when a
non-2xx is an expected outcome rather than an exception.

**This mode is not exception-free.** See the next section: a decode failure raises in both modes, and
so does a failed token fetch. Mapping a `Failure` to your own error uses the same function as the
raising path — see *Guarding every call site*.

## The failures that are not `ApiError`

Each of these reaches your boundary without matching `except ApiError`.

### Decode failures — and they bypass *both* response modes

If a body does not deserialize, decoding raises `pydantic.ValidationError` (a subclass of
`ValueError`), or a plain `ValueError` when the body is not JSON at all. The pipeline states the rule
outright: *a deserialization failure is not an API error, so it propagates in both response modes
rather than becoming a failure.* `with_raw_response` does **not** convert it into a `Failure`.

It arrives from two directions that mean opposite things:

- **A 2xx whose body drifted** → the call may well have *succeeded* server-side and you cannot read
  the result. The outcome is **unknown**. For a write, re-read state rather than retrying blindly.
- **A non-2xx whose body does not match the declared error schema** → the request was **rejected**;
  only the detail was lost. Retrying is pointless, since it can never succeed.

Mapping both to a 5xx is wrong half the time. At minimum, do not report a deterministic rejection as
an outage.

**On the success path this fires far less often than you would expect, and the gap it leaves is
worse.** Models are generated with required members only where the description marks them required —
which is frequently nowhere — and every other member defaults to `UNSET`. A response missing a field
therefore validates cleanly:

```python
value = client.{Group}.{Operation}(...)   # 200 with a truncated or empty body
value.{member}                            # UNSET — not an exception, not None
```

A `ValidationError` on a 2xx means a *type* mismatch or a non-JSON body, not an absent field. So the
guard belongs somewhere else than you would place it by habit:

```python
value = client.{Group}.{Operation}(...)
if value.{member} is UNSET:
    raise ProviderError(502, "{Operation} returned no {member}", outcome_unknown=True)
```

**Assert on the members you depend on, immediately after every call that matters.** For a write, an
absent identifier has the same "outcome unknown" character as a decode failure — the call may have
taken effect and you cannot name what it created. Nothing in the SDK does this for you.

### Transport failures — the HTTP library's exceptions, unwrapped

The SDK does **not** wrap its transport's exceptions where you catch them. The protocol says
implementations *may raise their underlying library's exceptions*; the shipped transport reports a
failed send to the retry loop, and when the last attempt fails the pipeline raises the library's own
exception. So connection refused, DNS failure, TLS error, dropped socket and timeout all reach you as
`httpx2` exceptions.

⚠ **`httpx2.HTTPError` is the base class of every one of them, timeouts included.** A lone
`except httpx2.HTTPError` arm therefore catches connection-refused and read-timeout together and gives
them one outcome — and those are opposite facts.

**Which transport failures reached the server, and which did not.** This is a property of the
exception class, not a judgement call:

| exception | did the request reach the server? | outcome |
| --- | --- | --- |
| `httpx2.ConnectError` | **no** — refused, DNS failure, TLS rejected | **known**: nothing happened |
| `httpx2.ConnectTimeout` | **no** — the connection was never established | **known**: nothing happened |
| `httpx2.PoolTimeout` | **no** — no connection was ever acquired from the pool | **known**: nothing happened |
| `httpx2.ProxyError` | **no** — the proxy refused before forwarding | **known**: nothing happened |
| `httpx2.ReadTimeout` | **maybe** — the request went out, the reply never came | **unknown** |
| `httpx2.WriteTimeout` | **maybe** — sending was interrupted mid-body | **unknown** |
| `httpx2.RemoteProtocolError` | **maybe** — the peer closed after the request went out | **unknown** |

`ConnectTimeout`, `PoolTimeout` and `ReadTimeout` are all `httpx2.TimeoutException` and they fall on
**opposite sides of this table**, so splitting on `TimeoutException` does not split on the thing that
matters. Split on whether the request was ever sent:

```python
import httpx2

except (httpx2.ConnectError, httpx2.ConnectTimeout, httpx2.PoolTimeout, httpx2.ProxyError) as e:
    # Nothing reached the provider. Fail the operation outright; there is nothing to reconcile.
    ...
except httpx2.RequestError as e:
    # It may have landed. Record the outcome as UNKNOWN and reconcile before any retry.
    ...
```

Catch `httpx2.RequestError`, not `httpx2.HTTPError`, in that second arm. `HTTPError` is also the base of
`HTTPStatusError` — what `raise_for_status()` raises — and that one means a **complete response
arrived**, so sweeping it into the unknown-outcome arm mislabels the one case that is fully known.

⚠ **`PoolTimeout` is the one to get right.** It is the characteristic failure of a saturated sync
client, which is the setup this skill recommends — so it arrives *in bulk*, exactly when the system is
already under strain. Marking it unknown floods reconciliation with work at the worst moment, for
requests that were never sent.

**Only the second arm has an unknown outcome.** Marking a refused connection "unknown" is not the
cautious default: it schedules reconciliation for an event that provably did not happen, and it
trains the caller to distrust a failure that is in fact definitive.

Note the coupling: your error boundary imports the transport's exception types because the SDK's
transport does. If you supply a custom transport (`python-client-initialization`), it is *your*
transport's exceptions that arrive and this clause needs revisiting.

### A streamed download moves the failure out of the call

An operation that returns a file is one place where the call returning successfully does not mean
the transfer succeeded. The pipeline yields as soon as the response *head* arrives; the body is still
on the socket. So a connection dropped mid-transfer raises out of `read()`, `iter_bytes()` or
`save_to(...)` — not out of the call — and a `try` wrapped around the call alone catches nothing:

```python
f = client.{group}.{operation}(...)      # returns on the head; nothing is downloaded yet
try:
    f.save_to("out.bin")                 # the transport failure surfaces here
except httpx2.RequestError:
    ...
```

Three consequences. The status code and headers are trustworthy before the body is — a `Failure` on a
streamed call is a real outcome, not a guess. A partial write is possible, which is why `save_to`
stages through `<name>.part` and renames only on success, so a failed download never appears under the
final name. And `request_options={"timeout": ...}` bounds **each read**, not the call as a whole, so a
stalled transfer raises rather than hanging. The same holds on the async client, with the failure
raising out of the awaited consumer. `python-calling-endpoints` has the lifecycle itself.

### An event stream raises from the loop

An operation that returns an event stream succeeds as soon as the head arrives, like a download. What
follows raises from the **loop**: a frame the event type rejects raises pydantic's `ValidationError`
after the stream has closed, an oversized event or bad UTF-8 raises `ValueError`, and a dropped or
stalled connection raises `httpx2.RequestError` — there is no SSE exception class.
`python-event-streams` has the full table.

### Authentication failures wear the same exception

A failed token fetch raises `ApiError` — but its payload is `OAuthProviderError | RawError`, **not**
the operation's union. Two consequences:

- It surfaces out of the **operation call**, because the token is fetched lazily on first use. The
  traceback points at whichever operation ran first, not at the client you configured.
- It raises in `with_raw_response` mode too, because the fetch happens while the request is being
  built, before anything is sent.

Check it **first** in the ladder — nothing was ever sent, so it is a configuration fault, not a
rejection:

```python
from {root_package}.core import OAuthProviderError

except ApiError as e:
    if isinstance(e.error, OAuthProviderError):
        raise ProviderError(502, "provider refused our credentials") from e
    ...
```

**A missing credential raises nothing at all.** The SDK never refuses to send a request because a
credential is absent — an unconfigured scheme contributes nothing and the request goes out
unauthenticated, so the server decides. With composite (AND/OR) security this holds too: a partial
set is applied as-is rather than withheld. There is no local "auth could not be satisfied" exception
to catch; you get a `401` from the provider instead. See `python-authentication`.

### Your own mistakes

`ValidationError` from constructing a model with a missing or wrong-typed member, and `TypeError` from
passing a positional argument to a keyword-only signature, are programming errors. Let them fail
loudly in development; do not let a production ladder swallow them.

## Guarding every call site

**Guard reads, not just writes.** It is easy to wrap the calls that create or modify something and
overlook the ones that only read — especially reads on a routine path (loading a screen, a scheduled
job, a health check). A connection failure during a read fails just as hard as one during a write. A
call left unguarded next to one that is guarded is the one that breaks.

**Convert failures to your own type in one place**, so the rest of the code has a single failure type
rather than four unrelated ones. The type is yours — the SDK's only exception class is `ApiError`;
transport and decode failures arrive as library exceptions, below. If your codebase already has an
error type, give it these two fields instead of adding another:

```python
class ProviderError(Exception):
    def __init__(self, status_code, message, *, outcome_unknown=False):
        super().__init__(message)
        self.status_code = status_code          # the status your boundary returns
        self.outcome_unknown = outcome_unknown  # whether anything may have happened upstream
```

One map turns the provider's answer into it, keyed on the status and the decoded body — the same
arms whichever way you called (below):

```python
import httpx2
from pydantic import ValidationError
from {root_package}.core import ApiError, OAuthProviderError
from {root_package}.models import {TypedError}

def provider_error(status, error) -> ProviderError:
    match (status, error):
        # OUR credentials or OUR quota: the caller did nothing wrong and cannot fix it.
        case (401 | 403, _) | (_, OAuthProviderError()):
            return ProviderError(502, "provider refused our credentials")
        case (429, _):
            return ProviderError(503, "rate-limited")

        # The provider rejected THE CALLER'S request: hand back the same status so they can act on it.
        case (s, {TypedError}() as body) if 400 <= s < 500:
            return ProviderError(s, body.{message_field})
        case (s, _) if 400 <= s < 500:
            return ProviderError(s, "The provider rejected the request.")

        # A provider 5xx: no meaningful caller status, and a write may have landed.
        case _:
            return ProviderError(502, "Provider unavailable.", outcome_unknown=status >= 500)

try:
    result = client.{Group}.{Operation}(...)

except ApiError as e:
    raise provider_error(e.status_code, e.error) from e

except ValidationError as e:
    raise ProviderError(502, "unreadable response", outcome_unknown=True) from e   # do NOT assume failure

except (httpx2.ConnectError, httpx2.ConnectTimeout, httpx2.PoolTimeout, httpx2.ProxyError) as e:
    raise ProviderError(502, "Never sent.", outcome_unknown=False) from e   # KNOWN: nothing happened

except httpx2.RequestError as e:
    raise ProviderError(504, "No response.", outcome_unknown=True) from e   # UNKNOWN: may have landed
```

**Your own time limit needs its own arm.** In async code, an `asyncio.wait_for` around the call raises
`asyncio.TimeoutError`, which none of these arms catches — map it like a read timeout:
`ProviderError(504, "No response.", outcome_unknown=True)`.

**The raw variant maps through the same function.** A `Failure` is a value, not an exception, so there
is nothing to chain `from`; and a refused token fetch still raises `ApiError` here (it happens before
the request is sent), so the `except ApiError` above stays around the raw call too:

```python
match client.{Group}.with_raw_response.{Operation}(...):
    case Success(payload=value):
        ...
    case Failure(error=err, status_code=status):
        raise provider_error(status, err)
```

Note the last two arms, and their order: the narrow tuple must come **first**, because
`httpx2.RequestError` is its base class and would otherwise swallow it. The two are different facts,
and a single `except httpx2.HTTPError` merges them.

⚠ **Two arms raising the same class with the same values is not a split.** The distinction has to
reach something that acts on it, or it is a comment. Note that both arms above raise the **same
class** on purpose — what differs is the **values they pass**, so there is no way to write either
line without deciding which case you are in. Two different class names carrying the same status and
no flag gives you two `except` arms, two messages, and **one behaviour**.

The carrier is the two fields on `ProviderError` above, and both arms must set them; and somewhere
downstream, something that branches on **both** of them:

```python
except ProviderError as e:
    if e.outcome_unknown:
        schedule_reconciliation(operation, reference)   # settle what actually happened
    return error_response(e.status_code, safe_message)  # 502 never sent · 504 outcome unknown
```

**Then write the test that tells the two apart.** This is what decides whether the split is real. The
check is not "are there two arms" but **"does one assertion pass for both inputs?"** — if it does, the
distinction is not real, however well the production branch reads:

```python
def test_unsent_is_not_the_same_failure_as_unknown():
    unsent  = failure_from(httpx2.ConnectError("refused"))    # never left the process
    unknown = failure_from(httpx2.ReadTimeout("no reply"))    # may have landed

    assert (unsent.status_code,  unsent.outcome_unknown)  == (502, False)
    assert (unknown.status_code, unknown.outcome_unknown) == (504, True)
    assert unsent.status_code != unknown.status_code         # the caller can tell them apart
    assert reconciled() == [unknown.reference]               # and only one reconciles
```

Two tests asserting the *same* exception for a refused connection and a read timeout is this defect
wearing a passing suite.

Always `raise ... from e`. Losing `__cause__` costs you the traceback that names which of the four
paths you were on.

## Presenting failures at your boundary

**Handle each failure kind the same way everywhere.** Pick one mapping from failure kind → outcome and
apply the identical ladder at every call site. When the same kind of failure becomes a different
result on a different operation, callers cannot reason about it.

**Keep distinct failures distinct — carry the provider's status.** A provider **4xx** the caller can
act on (validation, conflict, not-found) surfaces as that same client 4xx; a transport failure or an
unknown error has no meaningful client status and belongs at 5xx. Collapsing everything into one
blanket status discards the only signal separating "you sent something invalid" from "the provider is
down".

**Not every provider failure is the caller's fault.** A `401`/`403` means *your* credentials are wrong,
and a `429` means *your* quota is spent — passing either straight through tells the caller they are
unauthenticated or throttled when they are neither. Those belong at 5xx (the `match` above), and so
does the default arm.

**An unreadable body is two cases, not one — decide which before you map it.** An unreadable
*success* body is genuinely unknown: 5xx. An unreadable *error* body is not — the provider rejected
the request and only the detail was lost, so answering 5xx tells a retrying caller to keep retrying
something that can never succeed.

**Never map a parse failure onto a domain absence.** "I could not read the answer" is not "the
provider said no". On a lookup both leave you without a record, but only one is a fact — and where a
lookup gates a create, conflating them turns a corrupt response into a spurious create. If a miss is
signalled by an empty body, match on *empty*, not on *unparseable*.

**Never surface `str(e)` or a traceback to your caller.** For an SDK exception the string is only
`HTTP 422: {TypedError}`, so it is useless as well as leaky; a `ValidationError` embeds pydantic type
and field-path detail. Log the detail, return a message you wrote.

## Notes

- **Retries are on by default.** A retryable status or transport failure surfaces only after the last
  attempt, and the exception you catch is the same one a single attempt would raise. With `max_retries`
  set to `0` nothing is resent. See `python-configuration-resilience`.
- **A `401` invalidates the cached credential but does not retry the request.** Your code sees one
  `401` (your boundary answers it as `502`), and the *next* call obtains
  a fresh token. Do not read a single 401 as a permanent credential failure.
- `ApiError` implements `__reduce__`, so it pickles — it survives crossing a process boundary (a
  Celery result, a multiprocessing queue) with its payload intact.
- `e.headers` has **lowercased keys**, guaranteed by the transport contract — look up
  `"x-request-id"`, never `"X-Request-Id"`.



<!-- Source: .agents/skills/python-models/SKILL.md; MIT; original SHA-256 a82898746e6e31c771594956f8f51206f74f0f97d968e6056da7ab4e39e30065 -->

---
name: python-models
description: Working with models in an APIMatic-generated Python SDK — pydantic models and their TypedDict companions, required members vs the UNSET sentinel, why Optional here is not typing.Optional, open enums, union aliases and discriminators, collections, wire aliases, frozen instances, unknown-field preservation, and serializing with to_dict/to_json. Load before constructing request payloads or mapping SDK models onto your own types.
---

# Working with models in an APIMatic Python SDK

Most request/response data are **immutable pydantic v2 models** built with keyword arguments (covered
in `python-calling-endpoints`). This skill covers the **non-obvious model shapes** that trip
integrations up. The patterns are generic across APIMatic Python SDKs; take the real type and member
names from the contract sheet — the SDK map's **Type sources** table names the module declaring each
type, and the members themselves are read there, since the map carries no shapes — never from a
REPL poke at the installed package.

> Throughout this skill, `{...}` is a placeholder for a name you take from your SDK (e.g.
> `{root_package}`, `{Model}`, `{RequestType}`, `{Enum}`, `{Union}`, `{Variant}`) — replace it with the
> concrete identifier from the source.

## The base every model shares

Domain models subclass a generated base (`{root_package}.core.SdkBaseModel`) with a deliberate
configuration. It is **static generator code, identical in every APIMatic Python SDK**, and four of its
choices change how you write code:

| Config | What it means for you |
|---|---|
| `frozen=True` | Instances are immutable — assigning to a field raises. Use `model_copy(update={...})` to derive a changed copy. |
| `extra="allow"` | **Unknown fields are preserved, not dropped** — see below. |
| `validate_by_name` + `validate_by_alias` | Input is accepted under **either** the Python name or the wire alias. |
| `serialize_by_alias` | Output uses the **wire alias** by default. |

`frozen` blocks rebinding an attribute; it does **not** deep-freeze. A `list` or `dict` field's
contents remain mutable in place, so `model.{list_field}.append(...)` may well succeed and is still a
bug — treat the whole graph as read-only.

## Required vs optional: `UNSET`, and the `Optional` that is not `typing.Optional`

```python
class {RequestType}(SdkBaseModel):
    {required_field}: {Enum}OrStr                      # required
    {required_list}: list[{Model}]                     # required
    {optional_field}: Optional[{Model}] = UNSET        # optional
    {nullable_field}: OptionalNullable[str] = UNSET    # optional *and* nullable
```

- A **bare annotation** is required. Omit it and pydantic raises `ValidationError` at construction —
  which is the good case: the failure is at the point of the mistake, not at the API.
- **`Optional[T] = UNSET` is optional.** Leave it out entirely and the key is omitted from the JSON.

**`Optional` here means `T | UnsetType` — present or absent, with no `None` arm.** It is *not*
`typing.Optional[T]` (`T | None`), and the difference is the arm that matters: a field the spec does
not declare nullable must not be able to reach the wire as `null`. So:

```python
{RequestType}({required_field}="...", {required_list}=[...], {optional_field}=None)   # ✗ type error, and rejected
{RequestType}({required_field}="...", {required_list}=[...])                          # ✓ omitted
```

Never "clear" an optional field by passing `None`. Omit it, or pass `UNSET` explicitly if you are
building the kwargs dynamically.

A field annotated **`OptionalNullable[T]`** (`T | None | UnsetType`) is the three-state case: omitted,
explicitly `null`, or a value. The generator emits it for exactly the properties the spec declared both
optional *and* nullable. There, `None` *is* meaningful — it sends `null`, which for a PATCH-style API
is how you erase a value rather than leave it unchanged. Read the annotation before deciding what
`None` means.

`UNSET` is falsy and identity-stable, so all three of these work on a response at runtime — but only
one of them narrows for the type checker:

```python
from {root_package}.core import UNSET, UnsetType

if response.{optional_field}:                                        # falsy when UNSET (and when empty!)
if response.{optional_field} is not UNSET:                           # precise: was it set at all? — does NOT narrow
if not isinstance(value := response.{optional_field}, UnsetType):    # precise AND narrows: value is T here
    use(value)
```

`UNSET` is an *instance*, not a `Literal`, so after `is not UNSET` mypy/pyright still see
`T | UnsetType`, and every attribute access that follows is a `union-attr` error under `--strict`. Use
the `isinstance` form whenever you go on to *use* the value; reserve `is UNSET` for a yes/no test.
Prefer either precise form over truthiness when "set but empty" and "not set" are different facts.

## Dict companions

Every model has a `{Model}Dict` `TypedDict` companion mirroring it field for field, with optional
members marked `NotRequired`. Anywhere a model is accepted, the companion is too — the choice between
the two spellings is offered at the signature. Inside a companion, a nested model member is typed as
that model's companion alone (`{Model}Dict`), so a dict literal nests all the way down:

```python
{RequestType}({required_field}="...", {required_list}=[{"{member}": {"{nested}": "..."}}])
```

The companion is a **closed** TypedDict, so a misspelled key is a type-checker error at the call site
rather than a runtime surprise. Three caveats:

- the companion is a typing construct only — it performs no runtime validation until the SDK validates
  the whole body;
- it cannot express `UNSET`, so a dict simply omits what it does not set;
- **the closed check only helps if a type checker actually runs.** At runtime the model base is
  `extra="allow"`, so a misspelled key that no checker saw is *accepted* and sent as an extra field
  rather than rejected (see *Unknown fields are preserved* below). The dict spelling is only as safe
  as your `mypy`/`pyright` gate.

## Enums are open

Enums are real `Enum` subclasses — `(str, Enum)` for a string enum, `(int, Enum)` for a numeric one —
living under `{root_package}.models.enums`. Each is paired with an **open alias**: `{Enum}OrStr` =
`Annotated[{Enum} | str, ...]`, or `{Enum}OrInt` = `Annotated[{Enum} | int, ...]`. A field typed with
the open alias accepts either spelling:

```python
from {root_package}.models.enums import {Enum}

value = {Enum}.{MEMBER}     # preferred: checked, discoverable
value = "{wire_value}"      # also valid
```

The point of the open alias is forward compatibility: **a value the server adds after this SDK was
generated survives as a plain string (or int)** instead of raising. That cuts both ways, and it is the
thing to get right when *reading* a response:

```python
status = response.{enum_field}                 # may be {Enum} OR str

if status == {Enum}.{MEMBER}:                  # ✓ works for the known member
    ...

match response.{enum_field}:                   # handle the open arm explicitly
    case {Enum}.{MEMBER}: ...
    case {Enum}.{OTHER_MEMBER}: ...
    case str() as unknown:                     # a value newer than this SDK
        log.warning("unknown value %s", unknown)
```

An `if/elif` chain over members with no final `else` silently does nothing for an unknown value.

**Stringifying differs by enum kind.** The generator gives every enum `__str__ = str.__str__`. On a
`(str, Enum)` that is what you want — `str(member)` and f-string interpolation give the **wire value**
(`"{wire_value}"`), not `"{Enum}.{MEMBER}"`, so logging and comparison against raw strings both behave.
On an `(int, Enum)` that same assignment makes `str(member)` raise
`TypeError: descriptor '__str__' requires a 'str' object` — so never interpolate an int-enum member
into a log line or an f-string. Use `member.value` (or `int(member)`) instead.

## Union types: alias, not class

Where a field can be one of several types, APIMatic generates a **type alias** under
`{root_package}/models/unions/` — re-exported from `{root_package}.models`. There is no union class,
no factory method and nothing to unwrap: the alias *is* a PEP 604 union of the arms, and you pass a
variant directly.

```python
# anyOf — a plain alias, named after its arms
{Variant1}Or{Variant2}: TypeAlias = {Variant1} | {Variant2}
{Variant1}Or{Variant2}Dict: TypeAlias = {Variant1}Dict | {Variant2}Dict

# oneOf with a discriminator — the same union, tagged by the wire key
{Union}: TypeAlias = Annotated[
    Annotated[{Variant1}, Tag("{value1}")] | Annotated[{Variant2}, Tag("{value2}")],
    WireDiscriminator("{tag}"),
]
{Union}Dict: TypeAlias = {Variant1}Dict | {Variant2}Dict
```

**Construct** by building the variant you mean; **read back** with `isinstance` (or `match`):

```python
body = {RequestType}({union_field}={Variant1}(...))

if isinstance(response.{union_field}, {Variant1}):
    ...
elif isinstance(response.{union_field}, {Variant2}):
    ...
```

Four things the alias does not show:

- **The tag belongs to the union, not to the variant.** Build the variant you mean and pass it; the
  union writes the tag on the way out. One model can be an arm of several unions that tag it
  differently, so do not expect to find a tag field on it.
- **Some variants do carry the tag as a field, because the API declares it on them.** Where the
  field is there it is yours to set, and it is sent exactly as you wrote it — nothing overwrites it.
  Where it is not, `to_dict()` on that model carries no tag, so hand the model to the SDK rather
  than dumping it and posting the dict yourself.
- **The dict spelling must carry the tag.** Read the union's companion alias: where it names a
  wrapper (`{Union}{Variant1}Dict`), use that one — it is the variant's dict shape plus the tag key.
  Omitting the key raises `ValidationError` (`union_tag_not_found`) at runtime while type-checking
  cleanly.
- **A union whose arms collapse to one is inlined at the use site** — the field is simply typed
  `{Variant} | None` and no alias module exists. Do not go looking for an alias the sheet does not
  list.

## Collections

List properties are `list[T]`; maps are `dict[str, V]` — **the key type is always `str`**, whatever
the spec said. Inside a companion, a model element is typed as that model's companion
(`list[{Model}Dict]`).

```python
body = {RequestType}(
    {list_field}=["A", "B"],
    {map_field}={"k": "v"},
)
```

An **unset** collection is omitted from the JSON; an **empty** one (`[]`, `{}`) is serialized. Those
are different wire messages — do not use `[]` to mean "leave this alone".

## Wire aliases

The generator emits a pydantic alias for a field **exactly when the Python name no longer matches the
wire name** — snake-casing a `camelCase` property, sanitizing a name that is not a valid identifier,
escaping a Python keyword (trailing underscore, `type_` for `type`), or de-duplicating a collision.
Where the wire name is already a valid snake_case identifier, no alias is emitted at all.

```python
{field}: Optional[str] = Field(default=UNSET, alias="{wireField}")
```

The Python name is what you write in code; the alias is what crosses the wire. Both are accepted on
input, and output uses the alias. When a sheet lists a member as `{field} (wire {wireField})`, use
`{field}` in code and expect `{wireField}` in a captured request body — do not "fix" a test that
asserts the alias.

**The `…Dict` companion is keyed by the PYTHON name, not the alias.** A `TypedDict` cannot declare a
keyword or a non-identifier as a key through class syntax, and the base config's `validate_by_name` is
what makes the Python spelling work:

```python
client.{controller}.{operation}(body={"{field}": "..."})       # ✓ the companion's key
client.{controller}.{operation}(body={"{wireField}": "..."})   # validates, but type-checks as nothing
```

The serialized body carries `"{wireField}"` either way. The second form *does* validate at runtime via
`validate_by_alias` — so both happen to work, and only one is checked. Write the Python name.

## Serializing

```python
model.to_dict()                     # JSON-safe values, wire aliases, json.dumps-able
model.to_json()                     # the same content as text, indented 2 by default
model.to_dict(mode="python")        # keep Python objects (datetime stays datetime)
model.to_dict(by_alias=False)       # key by Python name instead
model.to_dict(exclude_none=True)    # drop nulls, round-trip safe
```

`to_dict`/`to_json` are the front door; `model_dump`/`model_dump_json` remain available for options
the wrappers do not surface (`include`/`exclude`, `context`, `round_trip`, `warnings`). Two behaviours
worth knowing:

- A never-touched `OptionalNullable` field is **omitted** by `to_dict`, even though a plain
  `model_dump` renders it as `null`. That is the tri-state being honoured; it is the one documented
  place the wrapper differs from the underlying dump.
- **`exclude_unset=True` is a trap on a locally built model.** It drops any field still sitting on
  its default — including a tag field that has one — after which the result
  no longer validates back against the union. Use `exclude_none=True` if your goal is just to
  suppress nulls. (On a *decoded response* it is the right tool — see the read-path note under the
  `Optional[Any]` trap below.)

## The `Optional[Any]` trap — a real serialization failure

**A field annotated `Optional[Any]` (or `OptionalNullable[Any]`) cannot be left unset.** Leaving it at
`UNSET` makes the whole model unserializable — `to_dict()`, `to_json()` *and the request path* all
raise:

```
pydantic_core._pydantic_core.PydanticSerializationError:
    Unable to serialize unknown type: <class '…core.optionality.UnsetType'>
```

`UnsetType` carries its own serializer, but `Any` absorbs the union arm before that serializer is
reached, so the sentinel arrives at pydantic's generic any-serializer, which has never heard of it.
Every other `Optional[T]` is fine, and so is a *container* of `Any` (`Optional[list[Any]]`,
`Optional[dict[str, Any]]`) — this is specific to a bare `Any` at the top of the annotation.

You get `Any` wherever the spec left a property unconstrained: a free-form object, an anonymous
object, or no schema at all. **Check the contract sheet for which members are typed `Any`** — it is
usually a small, fixed list, and a JSON-Patch-style `value` member is the classic case, because the
ops that take no value are exactly the ones that would leave it unset.

**Workaround: pass `None` explicitly.**

```python
client.{controller}.{operation}(body={Model}({field}=None))
# request body -> {"{field}": null}
```

It type-checks (`Any` admits `None`) and it serializes. Note the cost: the request now carries
`"{field}": null` where it should have carried nothing. Two consequences worth stating on any sheet
that touches such an operation:

- an explicit `null` is not the same wire message as an omitted key, so a strict server-side validator
  could reject it — confirm against sandbox before shipping;
- this is the one place where `None` on an `Optional[...]` field is correct. Everywhere else it is a
  type error (see above). Do not generalise it.

The dict spelling is no escape — it validates into the same model, sentinel included. If a future SDK
version widens these annotations, drop the explicit `None`.

**The trap fires on the read path too.** A *response* model whose `Any`-typed member the server
omitted decodes fine — and then fails `to_dict()` / `to_json()` with the same error, because that
member is sitting at `UNSET`. For a decoded response, `to_dict(exclude_unset=True)` is the escape: it
drops the sentinel before serialization, and the discriminator concern above does not apply to a
model the SDK decoded from the wire.

## Handing SDK values out

`UNSET` is not `None`, and nothing outside the SDK knows what it is. `json.dumps`, a web framework's
response encoder, an ORM column, a cache or message-queue serializer will each raise on it —
typically `Unable to serialize unknown type: UnsetType` or a `TypeError` — and in a request handler
that surfaces as a 500 the first time an optional member happens to be absent. Before an SDK value
crosses your boundary, do one of two things:

- map it into your **own** type, resolving `UNSET` to `None` or to an absent key as you go (the
  `isinstance` / `is not UNSET` checks above are the tool);
- or serialize the **whole model** with `to_dict()` / `to_json()`, which know the sentinel.

Never pass a raw member straight through to something that will encode it.

## Unknown fields are preserved

Unlike SDKs that drop unmodelled JSON, `extra="allow"` keeps them — at every nesting level, readable
via `model_extra`, and **re-emitted under the key they arrived with**:

```python
extra = response.model_extra or {}
new_field = extra.get("{some_new_field}")
```

This makes it safe to read an object, change one member and send it back without silently discarding
server-side state you never modelled. The symmetry also means an unknown key *you* supply is sent
rather than rejected — convenient for a field newer than the SDK, and a silent no-op when you simply
misspell a real one. A misspelled optional member does not error; it becomes an extra. If a value you
set is not taking effect, check it against the sheet's member list before suspecting the API.

## Dates and numbers

The generator maps spec types to Python as follows — take the exact type of any given member from the
contract sheet rather than assuming:

| Spec type | Python type |
|---|---|
| `string` (plain, password, regex, ip, hostname, json-pointer, time, uri) | `str` |
| `string` / `email` | pydantic `EmailStr` |
| `string` / `uuid` | `uuid.UUID` |
| integer widths (`integer`, `long`) | `int` |
| fractional numbers (`number`, `decimal`) | **`float`** |
| `boolean` | `bool` |
| `binary`, `file` | `bytes` — **in a model member or a text position only**; see the third consequence below |
| `date` | the SDK's `Date` converter |
| `date-time` | `RFC3339DateTime`, `RFC1123DateTime` or `UnixSecondsDateTime` |

Three consequences:

- **Date/time fields use the SDK's converter types**, so the wire format is handled for you. Assign a
  `datetime`/`date` and read one back; do not format strings by hand. Every one of those names is an
  `Annotated` alias over the stdlib type, declared in `{root_package}/core/converters/date_time.py`:
  `Date` → `datetime.date`; `RFC3339DateTime`, `RFC1123DateTime` and `UnixSecondsDateTime` →
  `datetime.datetime`. The alias only governs the wire format. They are runtime types, so the map's
  **Type sources** tables do not list them — this is where they live; do not go searching.
- **There is no `Decimal` arm.** A fractional number becomes `float`, so a spec that models money as a
  number gives you binary floating point. Most payment APIs instead model money as a **`str`** scaled
  to the currency (`"10.00"`) — where yours does, build it with `Decimal` and format explicitly, never
  with `%f`/`round()` and never through a locale-dependent conversion that can produce `"10,00"`.
  **The decimal format is specific to the currency**, never the literal `2`:

  ```python
  from decimal import Decimal

  # ISO 4217 minor units (List One, published 2026-09-17) for every currency that does not have two.
  # A provider can differ from ISO; where it documents its own rule, that rule wins.
  EXPONENT = {
      "BIF": 0, "CLP": 0, "DJF": 0, "GNF": 0, "ISK": 0, "JPY": 0, "KMF": 0, "KRW": 0, "PYG": 0,
      "RWF": 0, "UGX": 0, "UYI": 0, "VND": 0, "VUV": 0, "XAF": 0, "XOF": 0, "XPF": 0,
      "BHD": 3, "IQD": 3, "JOD": 3, "KWD": 3, "LYD": 3, "OMR": 3, "TND": 3,
      "CLF": 4, "UYW": 4,
  }

  def amount(value: Decimal, currency: str) -> str:
      places = EXPONENT.get(currency, 2)
      return str(value.quantize(Decimal(1).scaleb(-places)))

  amount(Decimal("10"), "USD")      # "10.00"
  amount(Decimal("1000"), "JPY")    # "1000"   -- not "1000.00"
  amount(Decimal("1.2344"), "KWD")  # "1.234"  -- not "1.23"
  ```

- **`binary`/`file` is never `bytes`.** A file position takes `FileInput` (`AsyncFileInput` on the
  async client) and an operation that returns one hands back `FileResponse` (`AsyncFileResponse`).
  Both pairs live in `{root_package}.core` rather than `{root_package}.models`, so nothing on this
  page applies to them — see **python-file-handling**. Nothing base64-encodes or decodes for you
  either: where an endpoint asks for base64, hand it content that already is.

Currency codes are typically plain `str` with no enum — pass `"USD"`.

## ValidationError is your friend, not an error to suppress

Constructing a model wrong raises `pydantic.ValidationError` (a `ValueError`) with the exact field
path. That is the SDK catching your mistake at the point you made it. Let it propagate in development;
in production, catch it at the boundary where *you* assemble a payload from external input, and treat
it as a 4xx on your own API rather than an upstream failure.

See [reference.md](reference.md) for the mechanics — `UNSET` semantics, `model_copy`, enum helpers,
reading nested optional structures, and type-checking notes.

## Next

- Calls and bodies → **python-calling-endpoints**
- Error payload models → **python-error-handling**



<!-- Source: .agents/skills/python-testing/SKILL.md; MIT; original SHA-256 951e812bedd63ec037054268d06b6015df1e74211e319dc5f11727cda3b97278 -->

---
name: python-testing
description: Testing code that calls an APIMatic-generated Python SDK — which seam to fake (the transport protocol), asserting on the request the SDK actually built, covering the error and decode-failure paths, and keeping tests independent of SDK internals. Load before writing tests for the integration layer.
---

# Testing code that uses an APIMatic Python SDK

The client takes a **transport** in its constructor, which is the seam for testing: pass an object
satisfying the SDK's transport protocol, so no real network calls happen. The SDK ships no mocking
helpers and no test doubles — this is standard Python.

**Match the project's existing test stack — don't impose one.** Check the test dependencies and the
existing tests, then mirror both its **test framework** (pytest / `unittest`) and its **assertion
style**: if it uses `unittest`'s `self.assertEqual`, or an assertion library, write assertions that
way rather than switching to bare `assert`. The samples below use pytest + bare `assert` **purely for
reference** — they show the SDK testing seam and *what* to assert, not a mandated framework.
Substitute your own `{Api}Client` and operation names as well.

> Throughout this skill, `{...}` is a placeholder for a name you take from your SDK (e.g.
> `{Api}Client`, `{Group}`, `{Operation}`, `{root_package}`) — replace it with the concrete
> identifier from the source.

## A reusable stub transport

The transport is a `Protocol`, so a fake needs no base class, no registration and no `Mock` — just
its two methods, `send` and `close`. `send` answers with the response **head**; the body stays on
the stub until something reads it, which is what lets one stub serve a JSON call and a download
alike:

```python
import json
from collections.abc import Iterator, Mapping
from dataclasses import dataclass, field
from {root_package}.core import HttpRequest, HttpResponse

@dataclass
class StubResponse:
    """A canned head, with the body held as chunks until the SDK reads it."""

    status_code: int = 200
    headers: Mapping[str, str] = field(default_factory=dict)
    chunks: list[bytes] = field(default_factory=list)
    url: str = "https://api.test/resource"
    closed: bool = False

    def iter_bytes(self, chunk_size: int | None) -> Iterator[bytes]:
        yield from self.chunks
        self.close()          # a drained iteration releases the connection; a partial one does not

    def read(self) -> bytes:
        self.close()          # reading both buffers the body and releases the connection
        return b"".join(self.chunks)

    def close(self) -> None:
        self.closed = True


class StubTransport:
    """Satisfies the SDK's sync transport protocol: send() + close()."""

    def __init__(self, *responses: StubResponse) -> None:
        self._responses = list(responses)
        # Every request, in order — the token fetch appends too, so this is what you count.
        self.requests: list[HttpRequest] = []

    def send(self, request: HttpRequest) -> HttpResponse:
        self.requests.append(request)
        return self._responses.pop(0)

    def close(self) -> None: ...

    @property
    def last_request(self) -> HttpRequest:
        return self.requests[-1]          # IndexError when nothing was sent


def json_response(status: int, body: object) -> StubResponse:
    return StubResponse(
        status_code=status,
        headers={"content-type": "application/json"},   # lowercase keys, per the transport contract
        chunks=[json.dumps(body).encode()],
    )
```

A download is queued exactly like anything else: one seam means one kind of stubbed response, and
nothing about the stub says which operation it answers. Assert on `StubResponse.closed` to prove the
caller consumed the body and released the connection.

`chunks` defaults to empty, so an empty `204` is just `StubResponse(status_code=204)` — which is what
an operation declaring no response body expects (`python-calling-endpoints`).

Wire it in and you have a real client with no network:

```python
def client_returning(*responses: StubResponse) -> tuple[{Api}Client, StubTransport]:
    transport = StubTransport(*responses)
    # retry_options=0: retries are on by default, so without it a stubbed 429 or 503 on a GET would be
    # sent four times, with real waits between them.
    client = {Api}Client(custom_http_client=transport, retry_options=0, {scheme}=...)
    return client, transport
```

The keyword is `custom_http_client=` on the sync client and `custom_async_http_client=` on the async
one; both constructors are keyword-only, and the credential keyword is named after the scheme the
contract sheet lists. Its value is that scheme's type: a plain `str` for a bearer token or an API key,
the credentials model or dict for basic auth or an OAuth grant (`python-authentication`).

**Do not patch the client's private attributes** (`_raw_client`, `_auth`, …) and do not
`Mock(spec={Api}Client)`. Both couple your tests to internals the generator is free to change, and a
mocked client cannot catch the mistakes that actually happen — a wrong path parameter, a body that
does not serialize, a header you forgot. Faking the transport exercises the real request-building
pipeline; that is the whole point.

### The token request comes first

With a managed-OAuth scheme configured, the token is fetched **lazily on the first authenticated
call**, through the same transport — so the *first* request your stub sees is the `POST` to the token
endpoint, not your operation. Two ways to handle it.

Queue a token response ahead of the operation's, and index from the end:

```python
def token_response() -> StubResponse:
    return json_response(200, {"access_token": "t", "token_type": "Bearer", "expires_in": 3600})

client, transport = client_returning(token_response(), json_response(201, {...}))
...
assert len(transport.requests) == 2
req = transport.last_request          # index from the end, not [0]
```

Or bypass acquisition entirely with a stub token source — the generator's supported injection point
(`python-authentication`) — so the stub transport only ever sees your operation:

```python
from {root_package}.core import OAuthTokenRefreshable

# {Credentials} is the type inside your client's `{scheme}_token_source` annotation — for example
# `ClientCredentials[{Scope}]` — imported the way the client module imports it.
class StubTokenSource:        # TokenSource and RefreshableTokenSource
    def fetch(self, credentials: {Credentials}) -> OAuthTokenRefreshable:
        return OAuthTokenRefreshable(access_token="t", token_type="Bearer")
    def refresh(self, credentials: {Credentials}, refresh_token: str) -> None: ...  # authorization code needs it

class AsyncStubTokenSource:   # AsyncTokenSource and AsyncRefreshableTokenSource
    async def fetch(self, credentials: {Credentials}) -> OAuthTokenRefreshable:
        return OAuthTokenRefreshable(access_token="t", token_type="Bearer")
    async def refresh(self, credentials: {Credentials}, refresh_token: str) -> None: ...

client = {Api}Client(
    custom_http_client=transport,
    {scheme}={"...": "..."},   # still required: a valid credential for the grant (`python-authentication`)
    {scheme}_token_source=StubTokenSource(),
)
```

The token is **cached on the scheme**, so only the first call fetches one: a test making two calls
against one client sees three requests, not four. Forgetting the token request is the most common way
a first test fails confusingly — the operation's decoder is handed the token body, and you get a
`ValidationError` about your payload rather than anything mentioning auth. The tests below queue only
the operation's response; for OAuth where the SDK fetches the token itself, put `token_response()` first
(except in the bad-credentials test).

## Test a success path

```python
def test_returns_deserialized_body():
    client, transport = client_returning(json_response(200, {"{wire_field}": "..."}))

    value = client.{Group}.{Operation}(...)

    assert value.{member} == "..."
    assert "/{expected/path}" in transport.last_request.url   # the operation, not the token
```

## Test an error path

Operations raise on non-2xx, and there is exactly **one** exception class — `ApiError`
(`python-error-handling`). You always catch it unparametrized and assert on the arm of its payload
union that the status maps to: the operation's typed error, or `RawError` for a status it does not
document.

**Typed arm:**

```python
import pytest
from {root_package}.core import ApiError
from {root_package}.models import {TypedError}

def test_raises_on_api_error():
    client, transport = client_returning(json_response(422, {"...": "..."}))

    with pytest.raises(ApiError) as exc_info:
        client.{Group}.{Operation}(...)

    e = exc_info.value
    assert e.status_code == 422                    # always present, whichever arm you got
    assert isinstance(e.error, {TypedError})       # narrow before reading fields
    assert e.error.{message_field} == "..."
    assert "/{expected/path}" in transport.last_request.url   # the operation, not the token
```

**`RawError` arm** — a status the operation does not document, which every operation can produce:

```python
from {root_package}.core import RawError

def test_unmapped_status_is_raw():
    client, transport = client_returning(json_response(418, {"whatever": 1}))

    with pytest.raises(ApiError) as exc_info:
        client.{Group}.{Operation}(...)

    assert isinstance(exc_info.value.error, RawError)
    assert exc_info.value.error.status_code == 418
    assert "/{expected/path}" in transport.last_request.url   # the operation, not the token
    # Body on demand: .text() always, .json() only if you know it is JSON (it raises ValueError).
```

**Take the union from the contract sheet per operation.** The typed arm is not one type across the
API, so an error test copied from a sibling operation can pass for the wrong reason — it lands in the
`RawError` branch and asserts nothing about the typed body you meant to check. And never assert on
`str(e)` or `repr(e)`: they render as status plus payload *type name* by design, and are not a stable
contract.

## Test the result-style (`with_raw_response`) variant

If your code uses the non-raising peer (`python-calling-endpoints`), there is nothing to catch — stub
the response and assert on the returned `ApiResult` directly. The split is mechanical: **2xx is
`Success`, everything else is `Failure`**, and both carry `.status_code` and `.headers`.

```python
from {root_package}.core import Failure, Success

def test_raw_response_reports_failure_without_raising():
    client, transport = client_returning(json_response(422, {"...": "..."}))

    result = client.{Group}.with_raw_response.{Operation}(...)

    assert isinstance(result, Failure)
    assert isinstance(result.error, {TypedError})       # the same union as the raising path
    assert result.status_code == 422
    assert "/{expected/path}" in transport.last_request.url   # the operation, not the token
```

This is also the mode to test in when your code depends on a header on the *success* path
(`Success(payload=..., status_code=..., headers=...)`), because the parsed form exposes neither —
except for a file response, which carries its own `headers` on the parsed path.

## Assert the outgoing request

`assert transport.requests` proves only that something was sent. Assert the things a regression would
actually change:

```python
from {root_package}.core import JsonBody

req = transport.last_request
assert req.method == "POST"
assert req.url.endswith("/{expected/path}")
assert "{query_param}=..." in req.url                    # query is part of the URL string
assert isinstance(req.body, JsonBody) and isinstance(req.body.value, dict)   # narrow before indexing
assert req.body.value["{wire_field}"] == "..."           # JsonBody carries the dumped payload
assert req.headers["authorization"] == "Bearer t"        # lowercase key — see below
assert req.headers["{header}"] == "..."                  # a real default reached the wire
```

**`HttpRequest.headers` keys are lowercased, not just the response's.** Every layer — the API's, the
endpoint's, the auth scheme's and your own `extra_headers` — is normalized before the merge, which is
exactly what makes the merge case-insensitive. So `req.headers["Authorization"]` is a `KeyError` and
`req.headers["authorization"]` is the assertion you want. This is the single most common way a first
request assertion fails confusingly. (The defensive `"authorization" in {k.lower() for k in
req.headers}` also works, but there is no case to defend against — assert the lowercase key.)

**The body is already serialized by the time a transport sees it.** `req.body` is one of `JsonBody`
(`.value`, the dumped JSON-safe object), `FormBody` (`.fields`), `MultipartBody` (`.parts`, an
ordered sequence of `MultipartText` and `MultipartFile` — **not** a `.fields`/`.files` pair, and a
file part's `content` is the unread descriptor you passed, never bytes), `BinaryBody`
(`.content`, `.media_type`) or `TextBody` (`.text`, `.media_type`, `.charset`) — no transport ever
serializes anything — so assert on the dumped value
directly rather than re-parsing bytes. Note it uses **wire aliases**, because that is what
serialization produces: if a model's Python name differs from its JSON name, the request body has the
JSON name. Do not "fix" that in the test.

**A list-valued query or form parameter has a per-parameter wire format.** The `Param` the generator
emitted for it in `apis/{controller}.py` carries a `SerializationFormat` — `indexed`
(`name[0]=a&name[1]=b`, URL-encoded as `name%5B0%5D=a`), `unindexed` (`name[]=a&name[]=b`), `plain`
(`name=a&name=b`), or `csv` / `tsv` / `psv` (`name=a,b`). Read it before asserting on `req.url`;
`"name=a" in req.url` is the assertion that fails against an indexed parameter. Path and header
arrays are not configurable — both fold to one comma-separated value.

Worth asserting once, somewhere, because they are silent when wrong:

- **The value actually reached the wire.** Models *preserve* unknown fields rather than rejecting them
  (`python-models`), so a misspelled optional member becomes a preserved extra field instead of an
  error. The only thing that catches it is an assertion on the serialized body.
- **Idempotency keys**, on operations that accept one: the same logical operation retried sends the
  *same* value, and two different operations send different ones (`python-configuration-resilience`).
- **Timeout plumbing.** `req.timeout` reflects a per-call `request_options={"timeout": ...}` and
  **only** that. The client's own `timeout=` never rides the request — it configures the SDK's default
  transport — so `req.timeout is None` on an ordinary call is correct, not a bug. A test that asserts
  the client-level timeout on a captured request is asserting something that was never there; and once
  you supply a stub transport, the client's `timeout=` reaches nothing at all.
- **Bodies that cannot serialize.** A value the SDK cannot dump raises *before* anything is sent, so
  the failure never reaches your stub and `transport.requests` stays empty. Worth one test where it
  applies (`python-models`).

## Cover the failures that are not `ApiError`

Three failure kinds never match `except ApiError`, and code that handles only the raised-`ApiError`
path is the norm (`python-error-handling`). Each is cheap to simulate.

**A decode failure — and it bypasses *both* response modes.** A body that does not deserialize raises
`pydantic.ValidationError` (or a plain `ValueError` for a non-JSON body). `with_raw_response` does
**not** turn it into a `Failure`:

```python
def test_unreadable_success_body_is_not_reported_as_failure():
    # A real decode failure needs a TYPE mismatch, not an absent member.
    client, transport = client_returning(json_response(200, {"{wire_field}": "not-a-list"}))
    with pytest.raises(ProviderError) as e:
        service.{operation}()
    assert e.value.outcome_unknown                 # unreadable: may have happened, never "failed"
    assert "/{expected/path}" in transport.last_request.url   # the operation, not the token
```

**A truncated 2xx that decodes cleanly.** Members are required only where the description marks them
required — often nowhere — so a response missing a member validates fine and reads back `UNSET`. Only
your own guard catches it, so test the guard:

```python
def test_truncated_success_body_is_not_reported_as_success():
    client, transport = client_returning(json_response(200, {}))   # no {wire_field}
    with pytest.raises(ProviderError) as e:
        service.{operation}()
    assert e.value.outcome_unknown                 # unreadable: may have happened, never "failed"
    assert "/{expected/path}" in transport.last_request.url   # the operation, not the token
```

**A transport failure**, which arrives as the HTTP library's own exception, unwrapped — have the stub
answer any token response you queue, then raise on the operation's request:

```python
class RaisingTransport(StubTransport):
    """Answers the queued responses, then raises `error` on the next send."""

    def __init__(self, error: Exception, *responses: StubResponse) -> None:
        super().__init__(*responses)
        self._error = error

    def send(self, request: HttpRequest) -> HttpResponse:
        if self._responses:                        # a queued token response, if any
            return super().send(request)
        self.requests.append(request)
        raise self._error


def client_raising(error: Exception, *responses: StubResponse) -> tuple[{Api}Client, RaisingTransport]:
    # Pass token_response() only for OAuth where the SDK fetches the token itself (no
    # {scheme}_token_source); never for bearer, API key or basic auth.
    transport = RaisingTransport(error, *responses)
    return {Api}Client(custom_http_client=transport, retry_options=0, {scheme}=...), transport


def test_refused_connection_is_a_known_outcome():
    client, transport = client_raising(httpx2.ConnectError("refused"))        # never sent
    with pytest.raises(ProviderError) as e:
        service.{operation}()
    assert (e.value.status_code, e.value.outcome_unknown) == (502, False)
    assert "/{expected/path}" in transport.last_request.url              # the operation, not the token


def test_read_timeout_is_an_unknown_outcome():
    client, transport = client_raising(httpx2.ReadTimeout("no reply"))        # may have landed
    with pytest.raises(ProviderError) as e:
        service.{operation}()
    assert (e.value.status_code, e.value.outcome_unknown) == (504, True)
    assert "/{expected/path}" in transport.last_request.url              # the operation, not the token
```

**Two transport failures, both inputs — never one.** A refused connection was never sent, so its
outcome is known: nothing happened. A read timeout may have landed, so its outcome is not. Test both
and expect **different** values — as the two tests above, or as the single two-input test
`python-error-handling` shows. A test that builds only one of them, or two that one assertion
satisfies, cannot tell the cases apart — and then neither can your code. When the SDK fetches a token,
let the token request through first: a failure *there* means your operation was never sent at all,
whatever the exception is called.

And the one people forget: **bad credentials**. A failed token fetch raises `ApiError` too, but its
payload is `OAuthProviderError | RawError` — *not* the operation's union — and it surfaces out of the
operation call. Return an RFC 6749 error body from the **token** request and assert your
configuration error, not a rejection error:

```python
def test_bad_credentials_is_a_config_error():
    client, _ = client_returning(json_response(401, {"error": "invalid_client"}))   # no token_response()
    with pytest.raises(ProviderError) as e:
        service.{operation}()
    assert e.value.status_code == 502              # our credentials: never the caller's 401
```

## Async tests

Same seam, async shape — `async def send`, and `aclose` rather than `close`. The async client reads
the response with `aiter_bytes`, `aread` and `aclose`, so queue an `AsyncStubResponse`, never a
`StubResponse`:

```python
from collections.abc import AsyncIterator
from {root_package}.core import AsyncHttpResponse, HttpRequest

@dataclass
class AsyncStubResponse:
    status_code: int = 200
    headers: Mapping[str, str] = field(default_factory=dict)
    chunks: list[bytes] = field(default_factory=list)
    url: str = "https://api.test/resource"
    closed: bool = False

    async def aiter_bytes(self, chunk_size: int | None) -> AsyncIterator[bytes]:
        for chunk in self.chunks:
            yield chunk
        self.closed = True

    async def aread(self) -> bytes:
        self.closed = True
        return b"".join(self.chunks)

    async def aclose(self) -> None:
        self.closed = True


def async_json_response(status: int, body: object) -> AsyncStubResponse:
    return AsyncStubResponse(
        status_code=status,
        headers={"content-type": "application/json"},
        chunks=[json.dumps(body).encode()],
    )


class StubAsyncTransport:
    def __init__(self, *responses: AsyncStubResponse) -> None:
        self._responses = list(responses)
        self.requests: list[HttpRequest] = []
    async def send(self, request: HttpRequest) -> AsyncHttpResponse:
        self.requests.append(request)
        return self._responses.pop(0)
    async def aclose(self) -> None: ...
    @property
    def last_request(self) -> HttpRequest:
        return self.requests[-1]

@pytest.mark.asyncio
async def test_operation():
    transport = StubAsyncTransport(async_json_response(200, {...}))
    client = Async{Api}Client(custom_async_http_client=transport, retry_options=0, {scheme}=...)
```

Use `pytest-asyncio` or `anyio`, whichever the project already uses. The type checker rejects a sync
stub passed to the async client and vice versa, which is a genuine safety net — do not silence it with
a `# type: ignore`.

## Keeping tests independent of SDK internals

- **Never import from a private module.** Everything you need is re-exported from
  `{root_package}.core`, `.models`, `.models.enums` and `.errors`. An import reaching into the
  runtime's internal layout (`…core.results`, `…core._internal.…`) will break — those modules are
  explicitly free to move behind the facade.
- **Never assert on `str(e)` / `repr(e)`** of an SDK exception or a `RawError`. Both are deliberately
  terse — status and payload type name only, body omitted — and are not a contract. Assert
  `e.status_code` and the narrowed `e.error` fields.
- **Never introspect `model_fields`** to build test data. Construct models explicitly; a test that
  derives its payload from the model's own definition cannot detect a wrong payload.
- **Build fixtures with models, then serialize** — `{request_fixture}().to_dict()` — rather than
  hand-writing wire JSON, so a member rename fails the fixture instead of passing a stale test.
- **Test your own boundary's output, not the SDK's.** The valuable assertions are that a 4xx the
  caller caused becomes your 4xx, a 4xx that is **yours** — `401`, `403`, `429` — becomes your `502`
  or `503`, and a transport failure becomes `502` if it was never sent and `504` if it may have landed
  (`python-error-handling`). That the SDK raises `ApiError` on a 422 is the SDK's own tested
  behaviour, not yours.

## Integration tests against a live environment

Keep them separate from unit tests (`-m integration`), skip when credentials are absent, and never
assert on ids or timestamps the provider generates:

```python
@pytest.mark.integration
@pytest.mark.skipif(not os.getenv("{API}_CLIENT_ID"), reason="sandbox credentials not configured")
def test_real_{operation}():
    with {Api}Client({scheme}=..., {server_keyword}={sandbox}, timeout=15.0) as client:
        value = client.{Group}.{Operation}(...)
        assert value.{member}
```

Point them at the sandbox/test environment **explicitly** rather than relying on the default, so the
test states which environment it needs. `{server_keyword}` is `environment=` wherever the client has
one, else `base_url=` or `server_config=`, with the value shaped as the table in
`python-configuration-resilience` shows. Expect flakiness from the provider, not from your code, and
never gate CI on a third party's uptime unless you mean to.

## Notes

- **Retries are on by default**, so a stubbed `429`/`503` on a `GET`, `HEAD`, `PUT` or `OPTIONS` call is
  sent up to four times, with real backoff waits between them. Build test clients with
  `retry_options=0` so one stubbed response is seen exactly once. In a test *about* retrying, set a
  policy with `initial_delay` and `max_jitter` small, queue one response per attempt and count
  `transport.requests`. For the loop to retry a
  *transport* failure the fake must raise `TransportError` from `{root_package}.core` — a
  bare `httpx2.ConnectError` bypasses the loop and reaches the test on the first attempt
  (`python-configuration-resilience`).
- **A `401` invalidates the cached token but does not retry the request.** A test that stubs a `401`
  therefore sees one failed operation — and the *next* call in the same test re-fetches a token, so
  queue another `token_response()` for it.
- Mocking libraries (`unittest.mock`, `pytest-mock`) work too — the protocol is structural, so a
  `Mock()` with `send` and `close` configured satisfies it. The hand-written stub above gives you
  typed captured requests and ordered responses for free.
- **Stubbing a download** needs nothing extra: the SDK wraps the same `StubResponse` in the
  `FileResponse` your assertions see, so the stub decides what the caller reads and when the
  connection is released. Give it `chunks` if the test drives `iter_bytes`. What the caller may then
  do with it — and the `ResourceWarning` an abandoned one emits, which a category default filters
  unless you enable it here — is `python-file-handling`.
- **Use the client as a context manager or close it** in tests as in production; a stub's `close()` is
  a no-op, but the habit keeps the test and the real wiring the same shape
  (`python-client-initialization`).
- To look up an operation's signature, its request/response types, or an operation's error union, take
  them from the contract sheet — grounded in the operation's SDK map block, which carries all three —
  not from a reflected view of the installed package, and not from memory.
- Prefer this transport-seam approach over wrapping the SDK in your own protocol unless you need to
  abstract the SDK for other reasons.



<!-- Source: .agents/skills/python-models/reference.md; MIT -->

# Model mechanics — reference (APIMatic Python)

Supporting detail for `python-models`. Take type and member names from the contract sheet. `{...}` is a placeholder for a name from your SDK.

## `UNSET` semantics

```python
from {root_package}.core import UNSET, UnsetType
```

- A singleton: `UnsetType()` returns the existing instance, and `copy`/`deepcopy`/unpickle all
  preserve identity. So `field is UNSET` is reliable, including on a deep copy of a model.
- Falsy: `bool(UNSET) is False`. Convenient, but it collapses "unset" with "empty list" and
  "empty string" — use `is UNSET` when you need to tell them apart.
- `repr(UNSET)` is `"UNSET"`.
- It is only ever a **default**. Never construct `UnsetType()` yourself; pass `UNSET` if you need to
  spell "omitted" explicitly while building kwargs.

The two annotations that admit it, one per spelling a spec can declare:

```python
Optional         = T | UnsetType           # optional        — omitted or a value
OptionalNullable = T | None | UnsetType    # optional+nullable — omitted, null, or a value
```

Building a payload conditionally, without a `None` ever reaching a non-nullable field:

```python
body = {RequestType}(
    {required_field}="...",
    {optional_field}=value if value is not None else UNSET,
)
```

## Deriving a changed copy

Models are frozen, so mutate by copying:

```python
updated = body.model_copy(update={"{field}": "..."})
```

`update=` bypasses validation for the updated keys — pydantic does not re-validate a `model_copy`.
For values from an untrusted source, rebuild the model instead so validation actually runs.

## Enum helpers

```python
from {root_package}.models.enums import {Enum}

{Enum}("{wire_value}")             # wire value -> member; ValueError if unknown
{Enum}.{MEMBER}.value              # -> "{wire_value}"
str({Enum}.{MEMBER})               # -> "{wire_value}"  (str enums only — see below)
list({Enum})                       # every member
```

Coercing an unknown value with `{Enum}(...)` raises `ValueError` — that is the *closed* lookup.
The **open** alias used on model fields (`{Enum}OrStr` / `{Enum}OrInt`) does not raise; it passes the
unknown value through as the underlying scalar. Do not reimplement that coercion at your boundary;
read the field and handle the scalar arm.

`__str__ = str.__str__` is emitted on **every** enum, which is right for a `(str, Enum)` and wrong for
an `(int, Enum)`: on an int enum, `str(member)` and f-string interpolation raise
`TypeError: descriptor '__str__' requires a 'str' object`. Use `.value` for int enums.

Tolerating an unknown value when you must map to your own enum:

```python
def to_domain(value: {Enum} | str) -> MyEnum:
    match value:
        case {Enum}.{MEMBER}:       return MyEnum.A
        case {Enum}.{OTHER_MEMBER}: return MyEnum.B
        case _:                     return MyEnum.UNKNOWN     # covers new wire values
```

## Union aliases — finding the exact arms

A union is a **type alias**, not a class, so there is nothing to construct and nothing to unwrap. The
contract sheet lists the arms; each arm is used directly. The SDK map names the **module** declaring
the alias, not its arms — read them off the alias there.

```python
from {root_package}.models import {Union}          # also {root_package}.models.unions.{module}
```

- **Plain (`anyOf`)** — `{Union}: TypeAlias = {Variant1} | {Variant2}`, with a companion
  `{Union}Dict: TypeAlias = {Variant1}Dict | {Variant2}Dict`. Named after its arms when the spec gave
  it no name (`{Variant1}Or{Variant2}`).
- **Discriminated (`oneOf` with a discriminator, or an `allOf` base with subtypes)** —
  `{Union}: TypeAlias = Annotated[Annotated[{Variant1}, Tag("{value1}")] | …, WireDiscriminator("{tag}")]`.
  The tag is the union's: build the variant and the union writes it. Some variants also declare the
  tag as a field of their own, in which case it is yours to set. Where the companion alias names a
  wrapper (`{Union}{Variant1}Dict`), that is the dict spelling to use — the variant's own dict shape
  plus the tag key.
- **One surviving arm** — no alias module is emitted at all; the field is typed with that arm directly
  (`{Variant} | None` where a dropped arm was nullable). An alias the sheet does not list does not
  exist.
- Read a union back with `isinstance` / `match`; there are no `TryGet…`-style readers.

Two runtime notes that the annotation does not show:

```python
{RequestType}({union_field}={"{tag}": "{value}", ...})   # ✓ dict form must carry the tag
{RequestType}({union_field}={...})                       # ✗ ValidationError: union_tag_not_found
model.to_dict(exclude_unset=True)                        # ✗ drops the defaulted tag; no longer validates back
```

## Reading nested optional structures

**Response models declare almost everything optional** — a schema that marks nothing required produces
a model with no required member, so `{Model}.model_validate({})` succeeds and every field reads back
`UNSET`. Check the contract sheet for which response members, if any, are actually required.

Two consequences for reading a response:

- **A truncated body is not an error**, it is a model full of `UNSET`. Nothing raises. Check the
  members you actually depend on — see `python-error-handling`.
- A chain of `?`-style access is the normal shape. Python has no `?.`, so guard or use a walrus:

```python
value = None
if (items := response.{list_field}) and items[0].{nested}:
    value = items[0].{nested}.{leaf}
```

A member that is **required on the request model and optional on the response model** is common and
intentional — the same concept, two schemas. Never assume the response shape from the request shape.

## Unknown fields

```python
response.model_extra            # dict of preserved unknown keys, or None
response.model_fields_set       # which declared fields were explicitly set
```

Unknown keys are also reachable by attribute access **unless** the name collides with the model API
(`json`, `copy`, `dict`, `schema`, …). Prefer `model_extra["key"]` — it never collides.

## Type-checking notes

The SDK ships `py.typed`, so `mypy`/`pyright` check your calls against it fully.

- `Optional[T]` from the SDK and `typing.Optional[T]` are **different types**. If you import both into
  one module you will confuse yourself and your reader; the SDK's generated modules never import
  `typing.Optional` — unions are spelled with PEP 604 `|` — and yours should not shadow the name.
- Passing `None` to an `Optional[T]` field is a type error the checker reports. Believe it — at
  runtime it is also a `ValidationError`. (`OptionalNullable[T]` is the annotation that does admit
  `None`.)
- A `{Model}Dict` literal is checked structurally, so an unknown key is an error there too. That check
  is what makes the dict spelling safe to use at all — it is the *only* thing that catches a
  misspelling, since the model base is `extra="allow"` at runtime.



<!-- Source: SDK sdk-map.md; MIT -->

<!-- Generated file — do not edit; regenerated with the SDK. -->

# SDK map — Paypal (Python)

> A generated table of contents for this SDK. Consult this map and its sub-pages to learn signatures, error types, and server/auth wiring **by lookup**. Model shapes and enum values are *not* duplicated here — the map names the module declaring each type; read the shape there. Every name is the emitted spelling, so a wrong one fails at import rather than working silently.

|  |  |
| --- | --- |
| SDK display name | Paypal |
| Root package | `paypal` |
| Distribution name | `paypal` |
| Requires | Python 3.10 or later |
| API spec version | `2.29` |
| Generator | APIMatic |

Staleness check: the API spec version above changes when the SDK is regenerated from a new spec, and the package version is what `pip show` reports for the installed SDK. If a lookup here fails at import, re-read the module named in the row.

All `Source` paths on this map and its sub-pages are relative to the **SDK root** — the directory holding this file and `pyproject.toml` — never to the page that carries them. Open them as-is from the SDK root; if the SDK sits under a subdirectory of a larger repo, prefix that subdirectory.

---

## Getting a client

### Synchronous client

```python
from paypal import PaypalClient
from paypal.core import ClientCredentials

client = PaypalClient(oauth2=ClientCredentials(client_id="YOUR_CLIENT_ID", client_secret="YOUR_CLIENT_SECRET"))

# TODO: call endpoints here -- see api-reference.md

client.close()
```

Alternatively, scope it — `with PaypalClient(...) as client:` closes the pool on exit.

### Asynchronous client

```python
from asyncio import run

from paypal import AsyncPaypalClient
from paypal.core import ClientCredentials


async def main() -> None:
    client = AsyncPaypalClient(oauth2=ClientCredentials(client_id="YOUR_CLIENT_ID", client_secret="YOUR_CLIENT_SECRET"))
    # TODO: call endpoints here, awaiting each -- see api-reference.md
    await client.aclose()


run(main())
```

Alternatively, scope it — `async with AsyncPaypalClient(...) as client:` closes the pool on exit.

`AsyncClient` (`paypal/async_client.py`) mirrors `Client` method for method, each endpoint method a coroutine. It takes the same keywords, except that each client accepts only its own transport and — where the **Async Type** column differs — only its own flavor.

`Client` and `AsyncClient` are aliases of `PaypalClient` and `AsyncPaypalClient` — the names tracebacks and `repr()` show; all four import from the root.

`close()` / `aclose()` closes the transport even when you supplied one via `custom_http_client=` / `custom_async_http_client=`, and a closed client cannot be reused.

Every API group is a property on the client (e.g. `client.orders`). Every constructor argument is optional and keyword-only. Sources: `paypal/client.py`, `paypal/async_client.py`:

| Keyword | Sync Type | Async Type | Default |
| --- | --- | --- | --- |
| `base_url` | `str \| None` | `str \| None` | `None` |
| `timeout` | `float` | `float` | `30.0` seconds |
| `retry_options` | `int \| RetryOptionsOrDict \| None` | `int \| RetryOptionsOrDict \| None` | `None` |
| `custom_http_client` | `HttpClient \| None` | — | `None` |
| `custom_async_http_client` | — | `AsyncHttpClient \| None` | `None` |
| `oauth2` | `ClientCredentialsOrDict \| None` | `ClientCredentialsOrDict \| None` | `None` |
| `oauth2_token_source` | `TokenSource[ClientCredentials] \| None` | `AsyncTokenSource[ClientCredentials] \| None` | `None` |

The types those columns name — where each imports from and, for a credentials dict, its keys:

| Type | Import from | Shape |
| --- | --- | --- |
| `RetryOptionsOrDict` | `paypal.core` | a retry count, `RetryOptions`, or a dict: `max_retries: int` · `initial_delay: float` · `backoff_factor: float` · `max_delay: float` · `max_jitter: float` · `status_codes_to_retry: frozenset[int]` · `http_methods_to_retry: frozenset[HttpMethod]` |
| `HttpClient` | `paypal.core` | protocol — `send(request: HttpRequest) -> HttpResponse` · `close()`; `send` returns once the head has arrived and never reads the body, and raises `TransportError` (from `core`) when no response arrives — anything else it raises is never retried |
| `ClientCredentialsOrDict` | `paypal.core` | `ClientCredentials` or a dict: `client_id: str` · `client_secret: str` · `scopes: list[Scope] \| None` |
| `TokenSource` | `paypal.core` | protocol — `fetch(credentials) -> OAuthToken` |
| `ClientCredentials` | `paypal.core` | `client_id: str` · `client_secret: str` · `scopes: list[Scope] \| None` |
| `AsyncHttpClient` | `paypal.core` | protocol — `async send(request: HttpRequest) -> AsyncHttpResponse` · `async aclose()`; the same obligation, awaited |
| `AsyncTokenSource` | `paypal.core` | protocol — `async fetch(credentials) -> OAuthToken` |

### Retries — on by default

`retry_options` left at `None` applies the default `RetryOptions` policy below, so an unconfigured client **retries**: a request whose method is in `http_methods_to_retry` is sent again when it gets a status in `status_codes_to_retry`, or no response at all, and the last outcome reaches you only once its retries are spent. A body that cannot be re-sent byte for byte — a streamed file upload — is never retried. `retry_options=0` (or `{"max_retries": 0}`) turns retrying off; a bare count sets `max_retries` and leaves every other field at its default.

`RetryOptions` fields (source: `paypal/core/retries.py`). Pass only the fields you change; each one left out takes its default:

| Field | Type | Default |
| --- | --- | --- |
| `max_retries` | `int` | `3` |
| `initial_delay` | `float` (seconds) | `1.0` |
| `backoff_factor` | `float` | `2.0` |
| `max_delay` | `float` (seconds) | `60.0` |
| `max_jitter` | `float` (seconds) | `0.5` |
| `status_codes_to_retry` | `frozenset[int]` | `frozenset({408, 429, 500, 502, 503, 504})` |
| `http_methods_to_retry` | `frozenset[HttpMethod]` | `frozenset({"GET", "HEAD", "PUT", "OPTIONS"})` |

The wait before retry *n* is `initial_delay × backoff_factor^(n−1)` plus up to `max_jitter` of random delay, the sum capped at `max_delay`; a `Retry-After` header replaces it, trimmed to `max_delay`.

A single call overrides two of these through `request_options` (`paypal/core/request_options.py`): `max_retries` and `status_codes_to_retry`, each merged over the client's policy field by field — `request_options={"max_retries": 0}` turns retrying off for that one call and leaves every other call alone.

---

## Error-handling model (read once — applies to every operation)

Every operation is reached in two response modes:

- **Parsed call.** Returns the decoded payload and raises `ApiError` on an error status, with the decoded body on `.error` and the status on `.status_code`.
- **Raw call.** Reached through `.with_raw_response`; returns `ApiResult` — `Success` or `Failure` — and never raises for an API error. Read `.payload` on a `Success` or `.error` on a `Failure`; both carry `.status_code` and `.headers`.

What `.error` holds is fixed per operation. There are two cases:

- **Case A — typed error.** The operation documents at least one error status, so `paypal/errors/` declares a union alias over the bodies those statuses map to — `RawError` is always its last arm, for any undocumented status — and `.error` is annotated with that alias. Narrow it with `isinstance`. The operation blocks name the alias and the status each arm maps from.
- **Case B — raw error.** The operation documents no error status; `.error` is `RawError` (`paypal/core/results.py`): `status_code: int` · `content: bytes` · `text(encoding="utf-8"): str` · `json(): Any`.

Core runtime types (`paypal/core/`) — public members with their **declared types**, verbatim from source:

| Type | Public members | Source |
| --- | --- | --- |
| `ApiError` — raised by every parsed call; `.error` is a Case A alias from `paypal/errors/` or `RawError` | `error: E` · `status_code: int` · `headers: Mapping[str, str]` | `paypal/core/exceptions.py` |
| `ApiResult[T, E]` — returned by every raw call; the `Success[T] \| Failure[E]` union | `payload: T` (on `Success`) · `error: E` (on `Failure`) · `status_code: int` · `headers: Mapping[str, str]` (both on either) | `paypal/core/results.py` |
| `RawError` | `status_code: int` · `content: bytes` · `text(encoding="utf-8"): str` · `json(): Any` | `paypal/core/results.py` |

Typed error bodies (the arms of a Case A alias) are ordinary models — no special handling. The operation's **Type sources** table gives the module that declares each one; read field names, declared types and JSON aliases there, as for any other model.

```python
try:
    response = client.orders.authorize_order("some example string")
except ApiError as e:
    # Case A — typed error: e.error is AuthorizeOrderErrorBody
    if isinstance(e.error, Error):
        # Handle 400, 401, 403, 404, 422, 500
        print(e.error)
    if isinstance(e.error, RawError):
        # Any other error status
        print(e.status_code, e.error.text())
```

**Raw (`.with_raw_response`) variants: present on every operation** — the same call returns `ApiResult` instead of raising, with the same body on `Failure.error`. Of **40 operations**, **39 are Case A (typed)** and **1 is Case B (raw)**.

---

## Operations — by controller (5 pages, 40 operations)

Each links to a sub-page with one block per operation, headed by its full accessor path: the HTTP verb and route (for a mock, a raw request or a provider-side log — never reconstruct it from the method name), the sync parsed signature with its required positional parameters, each parameter's role and — where it differs — wire name, both return types, and its error case — **Case A** names the alias and the status each arm maps from, **Case B** names `RawError`. Every block also carries a **Type sources** table — every *generated* type it names, with the module that declares it. A runtime type — a file alias, a date/time or byte converter — is not listed there.

**Each block states what is specific to its operation. Everything below holds for every operation, and blocks never restate it — silence means the default applies.**

| Applies to every operation | Stated where |
| --- | --- |
| **Four spellings, one signature** — the same method name and parameters on `Client` and `AsyncClient`, each also reachable through `.with_raw_response`; the async twin is a coroutine to `await`, with the same return types and error case, and where the **Async Type** column differs, pass the type it names | Getting a client |
| **Parsed raises, raw returns** — `ApiError` versus `ApiResult` | Error-handling model |
| **Case B error is always `RawError`** — also the last arm of every Case A alias, where a block's **Error arms** bullet ends in it | Error-handling model |
| **A trailing `request_options`** — keyword-only and optional, for per-call overrides such as a timeout, extra headers, `max_retries` or `status_codes_to_retry`; every signature ends with it | here (`paypal/core/request_options.py`), Retries |
| **Base URL `https://api-m.sandbox.paypal.com`** — this SDK's only server; override it with `base_url="https://…"` | Servers & auth |
| **Parameter names are literal** — signatures are generated code verbatim, and everything behind the bare `*` must be passed by name | here |
| **A parameter's wire name is its Python name** — sent as-is on the path, query string, header or body, unless the block's **Params** bullet carries a wire name beside the role | here |

**The operation's behavioural prose lives on the operation itself**, as the method's docstring in the module named at the top of its page, and again in `api-reference.md` with a per-parameter description and a usage sample. Blocks here give you the contract — names, types, shapes, errors. Where an operation's *semantics* decide what you must pass, that is what the docstring settles; read it there rather than filling it in from memory.

Sub-pages chunk per `###` block: each block is self-contained given the table above, and assumes this page is loaded beside it.

| Controller | Ops | Page |
| --- | --- | --- |
| `client.orders` | 8 | [map/operations/orders.md](map/operations/orders.md) |
| `client.payments` | 7 | [map/operations/payments.md](map/operations/payments.md) |
| `client.subscriptions` | 17 | [map/operations/subscriptions.md](map/operations/subscriptions.md) |
| `client.transaction_search` | 2 | [map/operations/transaction_search.md](map/operations/transaction_search.md) |
| `client.vault` | 6 | [map/operations/vault.md](map/operations/vault.md) |

---

## Models — where they live, how to build them

**Shapes live only in the source.** Every module under `paypal/models/` declares one type plus its input companion, and every module under `paypal/errors/` one alias plus the mapper that builds it; no two share a name. Take a type's module from the operation's **Type sources** table. When no retrieved chunk names it, the module is the type name in snake_case under the kind's directory below (`ActivateSubscriptionRequest` ↔ `activate_subscription_request.py`; an error alias drops its `Body` suffix: `ActivateBillingPlanErrorBody` ↔ `activate_billing_plan_error.py`). Never grep for a type.

| Group | Count | Directory (module = `<type_name>.py`) |
| --- | --- | --- |
| Models (`SdkBaseModel` pydantic classes) | 284 | `paypal/models/` |
| Enums (`Enum` over `str`) — Python member names + wire values | 87 | `paypal/models/enums/` |
| Error aliases (one per Case A operation) | 39 | `paypal/errors/` |

Conventions: a model is a `SdkBaseModel` (pydantic) class; a field whose wire name differs from its Python name carries it as `Field(alias=…)` (`type_` ↔ `"type"`) — read the alias off the field rather than deriving it. An omittable field is annotated `Optional[T]` and defaults to `UNSET`, and one that may also be explicitly null is `OptionalNullable[T]`; both come from `core` and neither is `typing.Optional` — there is no `None` arm unless the spec declared the property nullable, so passing `None` to the first is a type error rather than a value that serializes.

Every model and enum also has an **input companion**, exported beside it from the same package (`ActivateSubscriptionRequest` ↔ `ActivateSubscriptionRequestDict`). Wherever a signature names the companion you may pass either the model instance or a plain dict with the same keys, whichever reads better at the call site. An enum is a real `Enum` subclass over `str`; its companion is spelled `<Name>OrStr` or `<Name>OrInt` (`AvsCode` ↔ `AvsCodeOrStr`) and additionally accepts a wire value this SDK version does not know.

Import paths by content type (`from <package> import <Name>`):

| Contents | Import from |
| --- | --- |
| Client (root) | `paypal` |
| Operation controllers | `paypal.apis` |
| Models | `paypal.models` |
| Enums | `paypal.models.enums` |
| Error aliases | `paypal.errors` |
| Core runtime (`ApiError`, `ApiResult`, `RawError`, …) | `paypal.core` |

---

## Servers & auth

**OAuth2 (client credentials).** Pass `oauth2` your client id and secret; tokens come from `/v1/oauth2/token` on the base URL — so `base_url="https://…"` moves token traffic too.

Operation blocks name their scheme in an **Auth** bullet; an operation whose spec declares no scheme carries no such bullet.

- `AND` — every scheme listed must be configured for the call to succeed.
- `OR` — any one of the schemes listed can be used; the first one you configured is the one sent, in the order listed.

A scheme you did not configure is skipped silently rather than raising, and the request is sent anyway — so an authentication failure can mean no credential was sent rather than a bad one.

**One environment, one server** (`paypal/server/server_config.py`). The spec declares a single environment, so no `environment` keyword exists; the base URL and its override point:

| Base URL | Override point |
| --- | --- |
| `https://api-m.sandbox.paypal.com` | `base_url="https://…"` |




<!-- Source: SDK map/operations/orders.md; selected complete operation blocks; MIT -->

### client.orders.capture_order

- **Route**: `POST /v2/checkout/orders/{id}/capture`
- **Auth**: `oauth2`
- **Signature**: `def capture_order(id_: str, *, pay_pal_mock_response: str | None = None, pay_pal_request_id: str | None = None, prefer: str | None = "return=minimal", pay_pal_client_metadata_id: str | None = None, pay_pal_auth_assertion: str | None = None, body: OrderCaptureRequest | OrderCaptureRequestDict | None = None, request_options: RequestOptionsOrDict | None = None)`
  - required, positional: `id_`
- **Params**: `id_` — path `id` · `pay_pal_mock_response` — header `PayPal-Mock-Response` · `pay_pal_request_id` — header `PayPal-Request-Id` · `prefer` — header `Prefer` · `pay_pal_client_metadata_id` — header `PayPal-Client-Metadata-Id` · `pay_pal_auth_assertion` — header `PayPal-Auth-Assertion` · `body` — JSON body
- **Returns (parsed)**: `Order`
- **Returns (raw)**: `ApiResult[Order, CaptureOrderErrorBody]`
- **Error**: `CaptureOrderErrorBody` — **Case A (typed)**
- **Error arms**: `Error` [400, 401, 403, 404, 422, 500] · `RawError` [anything unmapped]

| Type | Source |
| --- | --- |
| `OrderCaptureRequest` | `paypal/models/order_capture_request.py` |
| `OrderCaptureRequestDict` | `paypal/models/order_capture_request.py` |
| `Order` | `paypal/models/order.py` |
| `CaptureOrderErrorBody` | `paypal/errors/capture_order_error.py` |
| `Error` | `paypal/models/error.py` |


### client.orders.create_order

- **Route**: `POST /v2/checkout/orders`
- **Auth**: `oauth2`
- **Signature**: `def create_order(body: OrderRequest | OrderRequestDict, *, pay_pal_mock_response: str | None = None, pay_pal_request_id: str | None = None, pay_pal_partner_attribution_id: str | None = None, pay_pal_client_metadata_id: str | None = None, prefer: str | None = "return=minimal", pay_pal_auth_assertion: str | None = None, request_options: RequestOptionsOrDict | None = None)`
  - required, positional: `body`
- **Params**: `pay_pal_mock_response` — header `PayPal-Mock-Response` · `pay_pal_request_id` — header `PayPal-Request-Id` · `pay_pal_partner_attribution_id` — header `PayPal-Partner-Attribution-Id` · `pay_pal_client_metadata_id` — header `PayPal-Client-Metadata-Id` · `prefer` — header `Prefer` · `pay_pal_auth_assertion` — header `PayPal-Auth-Assertion` · `body` — JSON body
- **Returns (parsed)**: `Order`
- **Returns (raw)**: `ApiResult[Order, CreateOrderErrorBody]`
- **Error**: `CreateOrderErrorBody` — **Case A (typed)**
- **Error arms**: `Error` [400, 401, 422] · `RawError` [anything unmapped]

| Type | Source |
| --- | --- |
| `OrderRequest` | `paypal/models/order_request.py` |
| `OrderRequestDict` | `paypal/models/order_request.py` |
| `Order` | `paypal/models/order.py` |
| `CreateOrderErrorBody` | `paypal/errors/create_order_error.py` |
| `Error` | `paypal/models/error.py` |


### client.orders.get_order

- **Route**: `GET /v2/checkout/orders/{id}`
- **Auth**: `oauth2`
- **Signature**: `def get_order(id_: str, *, fields: str | None = None, pay_pal_mock_response: str | None = None, pay_pal_auth_assertion: str | None = None, request_options: RequestOptionsOrDict | None = None)`
  - required, positional: `id_`
- **Params**: `id_` — path `id` · `fields` — query · `pay_pal_mock_response` — header `PayPal-Mock-Response` · `pay_pal_auth_assertion` — header `PayPal-Auth-Assertion`
- **Returns (parsed)**: `Order`
- **Returns (raw)**: `ApiResult[Order, GetOrderErrorBody]`
- **Error**: `GetOrderErrorBody` — **Case A (typed)**
- **Error arms**: `Error` [401, 404] · `RawError` [anything unmapped]

| Type | Source |
| --- | --- |
| `Order` | `paypal/models/order.py` |
| `GetOrderErrorBody` | `paypal/errors/get_order_error.py` |
| `Error` | `paypal/models/error.py` |




<!-- Source: SDK map/operations/payments.md; selected complete operation blocks; MIT -->

### client.payments.get_captured_payment

- **Route**: `GET /v2/payments/captures/{capture_id}`
- **Auth**: `oauth2`
- **Signature**: `def get_captured_payment(capture_id: str, *, pay_pal_mock_response: str | None = None, request_options: RequestOptionsOrDict | None = None)`
  - required, positional: `capture_id`
- **Params**: `capture_id` — path · `pay_pal_mock_response` — header `PayPal-Mock-Response`
- **Returns (parsed)**: `CapturedPayment`
- **Returns (raw)**: `ApiResult[CapturedPayment, GetCapturedPaymentErrorBody]`
- **Error**: `GetCapturedPaymentErrorBody` — **Case A (typed)**
- **Error arms**: `Error` [401, 403, 404] · `RawError` [500, anything unmapped]

| Type | Source |
| --- | --- |
| `CapturedPayment` | `paypal/models/captured_payment.py` |
| `GetCapturedPaymentErrorBody` | `paypal/errors/get_captured_payment_error.py` |
| `Error` | `paypal/models/error.py` |


### client.payments.get_refund

- **Route**: `GET /v2/payments/refunds/{refund_id}`
- **Auth**: `oauth2`
- **Signature**: `def get_refund(refund_id: str, *, pay_pal_mock_response: str | None = None, pay_pal_auth_assertion: str | None = None, request_options: RequestOptionsOrDict | None = None)`
  - required, positional: `refund_id`
- **Params**: `refund_id` — path · `pay_pal_mock_response` — header `PayPal-Mock-Response` · `pay_pal_auth_assertion` — header `PayPal-Auth-Assertion`
- **Returns (parsed)**: `Refund`
- **Returns (raw)**: `ApiResult[Refund, GetRefundErrorBody]`
- **Error**: `GetRefundErrorBody` — **Case A (typed)**
- **Error arms**: `Error` [401, 403, 404] · `RawError` [500, anything unmapped]

| Type | Source |
| --- | --- |
| `Refund` | `paypal/models/refund.py` |
| `GetRefundErrorBody` | `paypal/errors/get_refund_error.py` |
| `Error` | `paypal/models/error.py` |


### client.payments.refund_captured_payment

- **Route**: `POST /v2/payments/captures/{capture_id}/refund`
- **Auth**: `oauth2`
- **Signature**: `def refund_captured_payment(capture_id: str, *, pay_pal_mock_response: str | None = None, pay_pal_request_id: str | None = None, prefer: str | None = "return=minimal", pay_pal_auth_assertion: str | None = None, body: RefundRequest | RefundRequestDict | None = None, request_options: RequestOptionsOrDict | None = None)`
  - required, positional: `capture_id`
- **Params**: `capture_id` — path · `pay_pal_mock_response` — header `PayPal-Mock-Response` · `pay_pal_request_id` — header `PayPal-Request-Id` · `prefer` — header `Prefer` · `pay_pal_auth_assertion` — header `PayPal-Auth-Assertion` · `body` — JSON body
- **Returns (parsed)**: `Refund`
- **Returns (raw)**: `ApiResult[Refund, RefundCapturedPaymentErrorBody]`
- **Error**: `RefundCapturedPaymentErrorBody` — **Case A (typed)**
- **Error arms**: `Error` [400, 401, 403, 404, 409, 422] · `RawError` [500, anything unmapped]

| Type | Source |
| --- | --- |
| `RefundRequest` | `paypal/models/refund_request.py` |
| `RefundRequestDict` | `paypal/models/refund_request.py` |
| `Refund` | `paypal/models/refund.py` |
| `RefundCapturedPaymentErrorBody` | `paypal/errors/refund_captured_payment_error.py` |
| `Error` | `paypal/models/error.py` |

