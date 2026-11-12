import { Boxes, Fingerprint, ShieldCheck } from "lucide-react";
import type { RepairProofView } from "../../../packages/ai/src/repair-proof-view";
import styles from "./repair-proof-card.module.css";

export function RepairProofCard({ view }: { view: RepairProofView }) {
  return <section className={styles.card} aria-label="Observed repair execution boundary">
    <header><span><Boxes size={16} />OBSERVED EXECUTION</span><strong>{view.location}</strong><p>{view.summary}</p></header>
    <dl className={styles.boundary}>
      <div><dt>Network</dt><dd>{view.network}</dd></div><div><dt>Execution user</dt><dd>{view.user}</dd></div>
      <div><dt>Filesystem</dt><dd>{view.rootFilesystem}<small>{view.referenceFilesystem}</small></dd></div>
      <div><dt>Lifetime</dt><dd>{view.disposal}{view.elapsedMs !== null ? <small>{(view.elapsedMs / 1000).toFixed(3)} seconds {view.engine === "vercel_sandbox" ? "including lifecycle" : "through the runner receipt"}</small> : null}</dd></div>
    </dl>
    <details className={styles.identity}><summary><Fingerprint size={14} />Candidate and runner identity</summary><dl>
      <div><dt>Candidate SHA-256</dt><dd>{view.candidateHash}</dd></div><div><dt>Public suite SHA-256</dt><dd>{view.suiteHash}</dd></div>
      {view.snapshotId ? <div><dt>Hosted snapshot</dt><dd>{view.snapshotId}</dd></div> : null}
      <div><dt>Runner snapshot SHA-256</dt><dd>{view.snapshotHash}</dd></div>
      {view.image ? <div><dt>Image</dt><dd>{view.image}</dd></div> : null}
      <div><dt>Original evidence SHA-256</dt><dd>{view.originalEvidenceSha256}</dd></div>
    </dl></details>
    <p className={styles.scope}><ShieldCheck size={14} /><span>Every check in this receipt is public: the pinned suite ships in the repository. This receipt does not add a result to the sealed context study.{view.legacyHiddenFlags ? ` The stored runner record still carries an old internal “hidden” label on ${view.legacyHiddenFlags} of these public checks; the record is kept unmodified.` : ""}</span></p>
  </section>;
}
