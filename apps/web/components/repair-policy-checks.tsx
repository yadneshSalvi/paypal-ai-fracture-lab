import { Check, ShieldCheck, X } from "lucide-react";
import type { PolicyCheckDTO } from "@fracture/contracts";
import { Eyebrow } from "./primitives";
import styles from "./repair-policy-checks.module.css";

const repeatedConditions = new Set(["single-file", "imports", "ambient", "reflection", "network", "store"]);

/**
 * One pill per check the code actually evaluates, named for what that code tests.
 * Diff checks: inspectPatch in packages/service/src/repairs.ts. Source checks: inspectCandidate in packages/isolation/src/policy.ts.
 * Stored names and reasons are never rewritten; they remain in the observations list.
 */
export const policyCheckCatalog: Record<string, { name: string; tests: string; layer: "diff" | "source" }> = {
  "test-integrity": { name: "Tests and assertions unchanged", tests: "The patch edits no test file and removes no assert or expect line.", layer: "diff" },
  "secret-boundary": { name: "No secret reads or unapproved hosts", tests: "Added lines read no environment or credential file and name no host other than the PayPal sandbox.", layer: "diff" },
  "dependency-boundary": { name: "No process, eval or dependency changes", tests: "Added lines contain no child process, eval, dynamic import, require or package.json change.", layer: "diff" },
  "error-integrity": { name: "No swallowed errors", tests: "Added lines contain no empty catch and no catch that returns success.", layer: "diff" },
  "single-file": { name: "One checkout file that parses", tests: "The candidate is a single bounded TypeScript source with no syntax errors.", layer: "source" },
  imports: { name: "Only pinned contract imports", tests: "Imports are limited to node:crypto, the public payment core and the fixture contract; no re-exports or dynamic imports.", layer: "source" },
  ambient: { name: "No process, global or eval access", tests: "No process, globalThis, require, eval, Function or Reflect identifier appears.", layer: "source" },
  reflection: { name: "No prototype or computed-member access", tests: "No constructor or prototype access and no computed property access.", layer: "source" },
  network: { name: "Only the PayPal sandbox host", tests: "Every URL literal targets api-m.sandbox.paypal.com.", layer: "source" },
  store: { name: "No schema-altering SQL", tests: "No string contains DROP, ALTER, ATTACH, DETACH or PRAGMA.", layer: "source" },
};
const baseId = (id: string) => id.replace(/^(?:isolation|runner)-/, "");
const known = (check: PolicyCheckDTO) => { const entry = policyCheckCatalog[baseId(check.id)]; return entry && (entry.layer === "source") === /^(?:isolation|runner)-/.test(check.id) ? entry : undefined; };

/** Group only known authoring/runner counterparts with the same condition and source. */
function groupedConditions(checks: readonly PolicyCheckDTO[]) {
  const groups = new Map<string, { check: PolicyCheckDTO; observations: PolicyCheckDTO[] }>();
  for (const check of checks) {
    const suffix = baseId(check.id);
    const identity = /^(?:isolation|runner)-/.test(check.id) && repeatedConditions.has(suffix) ? `paired:${suffix}` : check.id;
    const source = check.source;
    const key = JSON.stringify([identity, check.name, check.reason, source?.path ?? null, source?.line ?? null, source?.label ?? null, source?.hash ?? null]);
    const existing = groups.get(key);
    if (existing) existing.observations.push(check);
    else groups.set(key, { check, observations: [check] });
  }
  return [...groups.values()].map(group => ({ ...group, passed: group.observations.every(check => check.passed) }));
}
const where = (check: PolicyCheckDTO, count: number) => { const entry = known(check); return !entry ? "Recorded policy check" : entry.layer === "diff" ? "Checked on the diff when the candidate was prepared" : count > 1 ? "Checked on the source at authoring and again inside the isolated runner" : check.id.startsWith("runner-") ? "Checked on the source inside the isolated runner" : "Checked on the source at authoring"; };

export function RepairPolicyChecks({ checks }: { checks: readonly PolicyCheckDTO[] }) {
  const groups = groupedConditions(checks);
  const passed = groups.filter(group => group.passed).length;
  const sourceChecks = groups.some(group => known(group.check)?.layer === "source");
  return <section className={styles.policy} aria-label="Patch policy checks">
    <div className={`policy-strip-heading ${styles.heading}`}><Eyebrow>PATCH POLICY CHECKS</Eyebrow><span>{passed}/{groups.length} checks passed · {checks.length} recorded evaluations</span></div>
    <div className="patch-policy-strip">{groups.map(({ check, observations, passed }, index) => <div key={`${check.id}-${index}`} className={`policy-check ${styles.condition} ${passed ? "pass" : "fail"}`} title={`${known(check)?.tests ?? check.reason} ${where(check, observations.length)}.${check.source ? ` ${check.source.path}:${check.source.line}` : ""}`}>
      {passed ? <Check size={13} aria-hidden="true"/> : <X size={13} aria-hidden="true"/>}<span>{known(check)?.name ?? check.name}<span className="sr-only">: {passed ? "passed" : "failed"}</span></span>{observations.length > 1 ? <small aria-label={`${observations.length} recorded evaluations`}>×{observations.length}</small> : null}
    </div>)}</div>
    <p className={styles.legend}>Each pill is one check the code evaluated on this candidate, with its recorded result. Diff checks run when the candidate is prepared{sourceChecks ? "; source checks run at authoring and again inside the isolated runner (×2 once verified)" : ""}.</p>
    {groups.filter(group => !group.passed).map(({ check, observations }, index) => <div className="policy-violation" key={`${check.id}-failure-${index}`}><ShieldCheck size={17}/><div><strong>{known(check)?.name ?? check.name} — failed. {check.reason}</strong>{check.source ? <code>{check.source.path}:{check.source.line}{check.source.label ? ` · ${check.source.label}` : ""}</code> : null}<span>{observations.some(row => row.passed) ? "Evaluations disagree. A failed policy evaluation remains blocking." : "This candidate cannot be promoted."}</span></div></div>)}
    <details className={styles.observations}><summary>Inspect all {checks.length} recorded evaluations</summary><p>A source check evaluated both at authoring and inside the runner shares one pill above. Every stored evaluation is listed below with its original name and reason; no receipt or verdict has been rewritten.</p><ol>{checks.map((check, index) => <li key={`${check.id}-${index}`}><div><code>{check.id}</code><strong data-passed={check.passed}>{check.passed ? "Passed" : "Failed"}</strong></div><b>{check.name}</b><p>{check.reason}</p>{known(check) ? <p>Tests: {known(check)!.tests}</p> : null}{check.source ? <code>{check.source.path}:{check.source.line} · {check.source.hash ?? "No source digest recorded"}</code> : null}</li>)}</ol></details>
  </section>;
}
