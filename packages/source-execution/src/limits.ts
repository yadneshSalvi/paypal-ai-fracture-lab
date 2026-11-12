export const SOURCE_EXECUTION_PROTOCOL = "fracture.source-execution/v1" as const;
export const SOURCE_ADAPTER_VERSION = "fracture.source-adapter/v1" as const;
export const PUBLIC_SUITE_HASH = "c3e3c478c3af78f82ba966e946cb578ef31b8a039855d920a65402adad190239";
export const ORIGINAL_CONTRACT_HASH = "5849fa0572b767e983ae339e0f1673c17597013a93d7efe027f47694675c5e80";
export const SCENARIO_IDS = ["happy", "lost", "malformed", "unavailable", "pending", "auth", "concurrent", "revoked", "payload"] as const;
export const SOURCE_LIMITS = Object.freeze({ maxFiles: 64, maxBytes: 2 * 1024 * 1024, maxFileBytes: 512 * 1024, maxPathLength: 240, maxCases: 9, planLifetimeMs: 15 * 60_000, caseDeadlineMs: 65_000, compilerDeadlineMs: 20_000, outputBytes: 2_000_000, targetOutputBytes: 64_000, rpcBytes: 256_000, rpcCalls: 2500, memoryBytes: 536_870_912, pids: 96, cpuNano: 1_000_000_000, temporaryBytes: 134_217_728, authorityPollMs: 100 });
export const SOURCE_LIMITATIONS = Object.freeze([
  "Sample: the unchanged nine public Bramble regression cases exercise a controlled local provider; they make no financial-provider or hidden-suite claim.",
  "An explicitly adapted TypeScript export is required. Browser targets, Python, dependency installation, package scripts and arbitrary applications are unsupported by this adapter.",
  "Only the selected immutable import closure is executed. Source Atlas remains its original static snapshot; runtime receipts are separate private records.",
  "The pinned public payment core, node:crypto and type-only @fracture/source-target/@fracture/contracts are the supported external modules.",
  "A result applies only to this source, adapter, suite, seed and qualified runner identity. A pass is not a universal correctness certificate.",
]);
