import { Check, ShieldCheck, X } from "lucide-react";
import type { PolicyCheckDTO } from "@fracture/contracts";
import { Eyebrow } from "./primitives";
import styles from "./repair-policy-checks.module.css";

const repeatedConditions = new Set(["single-file", "imports", "ambient", "reflection", "network", "store"]);

/** Group only known authoring/runner counterparts with the same condition and source. */
function groupedConditions(checks: readonly PolicyCheckDTO[]) {
  const groups = new Map<string, { check: PolicyCheckDTO; observations: PolicyCheckDTO[] }>();
  for (const check of checks) {
    const suffix = check.id.replace(/^(?:isolation|runner)-/, "");
    const identity = /^(?:isolation|runner)-/.test(check.id) && repeatedConditions.has(suffix) ? `paired:${suffix}` : check.id;
    const source = check.source;
    const key = JSON.stringify([identity, check.name, check.reason, source?.path ?? null, source?.line ?? null, source?.label ?? null, source?.hash ?? null]);
    const existing = groups.get(key);
    if (existing) existing.observations.push(check);
    else groups.set(key, { check, observations: [check] });
  }
  return [...groups.values()].map(group => ({ ...group, passed: group.observations.every(check => check.passed) }));
}

export function RepairPolicyChecks({ checks }: { checks: readonly PolicyCheckDTO[] }) {
  const groups = groupedConditions(checks);
  const passed = groups.filter(group => group.passed).length;
  return <section className={styles.policy} aria-label="Patch policy checks">
    <div className={`policy-strip-heading ${styles.heading}`}><Eyebrow>PATCH POLICY CHECKS</Eyebrow><span>{passed}/{groups.length} conditions passed · {checks.length} retained observations</span></div>
    <div className="patch-policy-strip">{groups.map(({ check, observations, passed }, index) => <div key={`${check.id}-${index}`} className={`policy-check ${styles.condition} ${passed ? "pass" : "fail"}`} title={`${check.reason}${check.source ? ` · ${check.source.path}:${check.source.line}` : ""}`}>
      {passed ? <Check size={13} aria-hidden="true"/> : <X size={13} aria-hidden="true"/>}<span>{check.name}</span>{observations.length > 1 ? <small aria-label={`${observations.length} retained observations`}>×{observations.length}</small> : null}
    </div>)}</div>
    {groups.filter(group => !group.passed).map(({ check, observations }, index) => <div className="policy-violation" key={`${check.id}-failure-${index}`}><ShieldCheck size={17}/><div><strong>{check.reason}</strong>{check.source ? <code>{check.source.path}:{check.source.line}</code> : null}<span>{observations.some(row => row.passed) ? "Observations disagree. A failed policy observation remains blocking." : "This candidate cannot be promoted."}</span></div></div>)}
    <details className={styles.observations}><summary>Inspect all {checks.length} original policy observations</summary><p>Equivalent authoring and runner conditions share one row above. Every original observation stays below; no receipt or verdict has been rewritten.</p><ol>{checks.map((check, index) => <li key={`${check.id}-${index}`}><div><code>{check.id}</code><strong data-passed={check.passed}>{check.passed ? "Passed" : "Failed"}</strong></div><b>{check.name}</b><p>{check.reason}</p>{check.source ? <code>{check.source.path}:{check.source.line} · {check.source.hash ?? "No source digest recorded"}</code> : null}</li>)}</ol></details>
  </section>;
}
