# Recorded Sandbox observations

`/observations` opens the public Bramble Books comparison recorded on 11 November 2026. It needs no session, database, model or provider connection. Its static page and JSON download use the unchanged `docs/evidence/live-bramble-qualification.json`, SHA-256 `d81039b1fd67eb93a5cce6c53e148075dc4140c53ba372adbfc4f4f1ef873a0a`. A mismatched fingerprint or invalid record produces an unavailable state rather than replacement history.

The faulty checkout has 20 observations: two separately approved orders, two completed $12 Sandbox captures and a separately approved $12 refund of the second capture. The historical hardened reference has 15 observations: one approved order, one completed $12 capture and one fulfillment. Bramble Books and Maya are fictional. Response loss was introduced locally after an actual upstream capture. This is one approved comparison, not a reliability rate or a new execution.

The sequence control projects each saved phone/application/provider state. Its inspector includes only capture and refund receipts already observed at that point. Final independent reads become visible at the final point and remain labelled as later reads. An original `COMPLETED` capture receipt and a later `REFUNDED` read are both retained; refunding the duplicate changes neither gross historical captures nor the original failure. Event records have no timestamps, so the scrubber uses observation numbers. Actual receipt timestamps remain in UTC.

The phone is a lab rendering of the saved application state, not a PayPal account screen or a new checkout. Its retry label cannot issue a payment. The historical hardened source is separate from subsequent AI-generated repairs and the sealed context study.

Buttons, a native range control and an accessible event list select the same observations. Revision tabs support arrow keys; explicit selections focus the result heading, range adjustments retain range focus, and the inspector restores its exact opener. A fragment such as `/observations#faulty:8` restores the selected point without a server mutation. The archive shell suppresses workspace initialization, polling, background route prefetch and session creation.

`/observations/archive` downloads the exact original JSON bytes and returns their SHA-256 in the response header. The complete download intentionally includes all 35 observations; it is separate from the cursor-scoped inspector.

Run validation from the repository root:

```sh
node node_modules/tsx/dist/cli.mjs --test tests/published-observation.test.ts tests/recorded-observation.dom.ts tests/model-runtime-entry.dom.ts
node node_modules/typescript/bin/tsc --noEmit
npm run build -- --webpack
```

DOM tools use the separate lockfile in `tests/component-runtime`. Tests cover all 35 prefixes, missing or inconsistent records, original-byte integrity, future-receipt exclusion, refund linkage, retained failure, anonymous zero-request entry, keyboard/dialog focus, reload, unavailable/loading recovery and the existing explicit Sample entry. Native visual behavior has a separate production-build gate.
