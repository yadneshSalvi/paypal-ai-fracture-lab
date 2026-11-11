# Context comparison protocol engine

The executable protocol validator, assignment generator and statistical analysis are implemented. The 600-attempt model study has **not yet run**. No model performance is implied by the validator's synthetic tests.

`npm run eval:context -- --help` describes three commands:

```sh
npm run eval:context -- verify --protocol corpus/protocol.json --root corpus
npm run eval:context -- freeze --protocol corpus/protocol.json --root corpus --out .artifacts/context-study/frozen
npm run eval:context -- summarize --protocol .artifacts/context-study/frozen/protocol.json --root corpus --results .artifacts/context-study/grades.json --out .artifacts/context-study/summary.json
```

The protocol requires 20 distinct tasks: five defect families, two languages, and one development plus one held-out task per family/language. Two frozen model configurations, one OpenAI and one Gemini, receive five repeated matched blocks and all three arms. This produces 600 assignments, including 300 held-out attempts. Arm order is deterministically shuffled within each task/model/repeat block. Seed labels define matching and ordering; they do not assert that a model API is deterministic.

Arm A receives no added documentation. B and C have separate per-model token-count receipts, the same maximum token budget, and actual counts within 1%. The manifest freezes task prompts, visible files, hidden tests, baseline/hardened sources, control evidence, context files, evaluator, runner and prompt template by SHA-256. The reader rejects traversal, credential/private paths, changed hashes and symlinks outside the corpus. Hidden tests and control/solution files cannot be declared model-visible. Runtime access enforcement belongs to the isolated candidate runner, not this manifest checker.

The grader queue contains only anonymous candidate IDs and task IDs. Grades omit arm and model labels. Analysis joins the frozen assignment matrix after collection; protocol authors and models are not fully blinded. A grade requires explicit compile, policy and hidden-test verdicts plus model/runner receipt hashes. A missing row remains missing. An infrastructure failure has no target verdict and remains in the reported denominator. Only the four predeclared transient infrastructure classes permit one linked retry; a graded first submission cannot be replaced. Once a model submission exists, a runner retry must reuse that exact source and provider receipt.

The primary outcome requires all three verdicts. Summaries retain eight separate model/language/split strata. Each comparison includes all five task dots and five repeats per arm. The paired bootstrap resamples tasks, not repeated model attempts. A 95% pointwise interval and a 97.5% Bonferroni interval for the two predeclared comparisons are separate fields. Intervals are withheld for any incomplete stratum. No global correction across model/language/split strata is claimed; five task clusters per stratum provide limited precision. Neutral and negative differences are retained without selecting a winning arm.

Freeze and report files use exclusive creation and are not overwritten. The source hashes and raw grade set have separate result hashes. Raw receipt hashes are references, not independent cryptographic attestations: the execution/collection owner must preserve and verify their referenced artifacts before publishing a result.

Still required for the actual study: the 20 independent qualified task fixtures, frozen licensed context snapshots, actual tokenizer receipts, verified model versions/settings, a two-language isolated executor, model-call collection, immutable receipt verification, all 600 actual submissions, and UI ingestion of the frozen report. The existing Bramble repair regressions remain separate from this experiment and are not counted as held-out model attempts.
