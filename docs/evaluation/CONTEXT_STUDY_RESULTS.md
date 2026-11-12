# Sealed context study

Study `fracture-context-2026-11-v1` completed its original 600-candidate schedule and was sealed on 12 November 2026. The research interface at `/evaluations` presents the frozen protocol, all original outcomes, submitted code, permitted context reads, model request metadata, offline SDK traces and the independent control checks.

The schedule is 20 authored tasks × three context arms × two model families × five repeats, including 300 held-out assignments. The models are `gpt-6.1-sol` and `gemini-3.8-flash`; the arms are ordinary SDK types, APIMatic skills, and a size-matched raw REST reference. Configuration, tokenization, source provenance and limitations are available in the interface.

## What happened

| Observation | Count |
| --- | ---: |
| Original candidates with terminal records | 600 |
| Scored outcomes | 301 |
| Outcomes with an actual isolated runner grade | 246 |
| Invalid or missing final submissions, counted as scored failures | 55 |
| Infrastructure outcomes without target verdicts | 299 |
| Retained attempt records, including allowed retries | 606 |
| Allowed infrastructure retries | 6 |
| Unique model generations | 601 |
| Recorded request dispatches | 9,322 |
| Response or error records | 9,318 |
| Unanswered dispatches | 4 |

**All eight model/language/split strata contain incomplete target outcomes. All 16 comparison intervals are withheld.** The observed scored rates do not establish that one context arm is superior. Infrastructure outcomes retain null target verdicts and are not silently treated as failures or successes. A scored submission failure does not mean behavioral tests executed.

Known usage produces a published-rate estimate of **$168.596110275**, with **295 calls unpriced**. This is not an invoice total or a complete charge estimate. Unknown transport outcomes were retained without redispatch; the saved record does not establish their underlying cause.

Payment resources used by the study are deterministic offline fixtures. These results do not claim new live PayPal behavior, general model superiority, blinded corpus authorship, or a completed independent user study.

## Inspect and reproduce

The interface exposes all 600 compressed receipts, the anonymous grades, result seal, full report, source freeze and control qualification. Candidate receipts contain final source and visible actions; private model reasoning and raw private provider payloads are excluded. CSV export follows the selected filters and leaves unknown verdicts blank.

```sh
npm run eval:context -- --verify-only
npm run eval:reproduce -- fracture-context-2026-11-v1
```

These commands verify the immutable inputs and reproduce the saved analysis without additional provider calls. The reproduction uses five task clusters per stratum and 10,000 bootstrap draws under the original protocol. Do not rerun, prune or replace settled candidates to improve the result.

| Binding | SHA-256 |
| --- | --- |
| Protocol | `5e2553c9d371c4f842fe60b0d68eeb26c58841c1738a4b71ff1d023617e37240` |
| Anonymous result | `efb34103ad2f8013b577991a0feac23deb8a310df4f7f63007d0fa1b28677c49` |
| Seal | `dc59e7326838dbe068817b557ac4ea4b9d81e5518bd313c6b69710f8a2ad19dc` |

The original study source is `1013b016aea43c56d3cee22fe3449323fdf155a4`. The exact isolated runtime archive is retained privately; rebuilding its Dockerfile is not proof of identical runtime bytes. The public result and research-interface qualification are separate from other application and payment qualifications.
