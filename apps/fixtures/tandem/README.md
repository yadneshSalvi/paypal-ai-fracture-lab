# Tandem Tickets

A $48 ticket, two application revisions, and one independent record of what the payment provider observed.

The faulty target creates a fresh order after a missing capture answer and can issue a ticket for a pending capture. The hardened target claims its business operation in PostgreSQL before dispatch, retains its provider request ID, and reconciles the original resource. An unknown create, partial capture or refund without an exact resource ID remains unresolved. No fabricated lookup or replacement charge closes that gap.

Both targets call the actual pinned APIMatic `paypal` 2.29 Python SDK. In these scenarios the host supplies explicitly **Sample** provider responses; no PayPal financial call occurs. Scripted Sample buyer approval is recorded separately from order creation. PostgreSQL retains target operations, provider resources, exact wire observations, frame acknowledgments and ticket entitlements across worker exits.

`sdk_adapter.py` handles the pinned SDK; `protocol.py` bounds its credential-free messages; `domain.py` contains the target decisions; `worker.py` executes one action. The trusted host lives in `packages/tandem/src`. Local subprocess tests run only this fixed source. The hosted runner uses a separately qualified, nonroot, offline Vercel Sandbox and verifies the source hash before execution.

From the repository root, with Python 3.11 and a disposable-capable PostgreSQL `DATABASE_URL` in the ignored `.env`:

```sh
uv venv --python 3.11 .artifacts/tandem-venv
uv pip install --python .artifacts/tandem-venv/bin/python -r apps/fixtures/tandem/requirements.txt
.artifacts/tandem-venv/bin/python -m pytest apps/fixtures/tandem -q
.artifacts/tandem-venv/bin/mypy --strict apps/fixtures/tandem/*.py
node --import tsx --test tests/tandem.test.ts
npm run typecheck
```

The domain tests create and remove uniquely named PostgreSQL schemas; they do not use an existing application's payment rows. Source-bound results are in `docs/evidence/tandem-domain-qualification.json` and `docs/evidence/tandem-cloud-domain-qualification.json`. These results do not establish live provider behavior, arbitrary-code safety, or the planned context-evaluation outcome. User-facing integration and broader scenario coverage are still being built.
