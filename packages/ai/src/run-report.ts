import type { EvidenceDTO, RunDTO } from "@fracture/contracts";
import { repairProofView, type RepairProofView } from "./repair-proof-view";

export interface RunReport {
  schemaVersion: 1;
  run: RunDTO;
  evidence: EvidenceDTO[];
  verificationViews: RepairProofView[];
  exportedAt: string;
}

export function runReport(run: RunDTO, evidence: EvidenceDTO[], exportedAt = new Date().toISOString()): RunReport {
  return { schemaVersion: 1, run, evidence, verificationViews: evidence.map(repairProofView).filter(view => view !== null), exportedAt };
}

const escape = (value: unknown) => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");

export function runReportHtml(report: RunReport): string {
  const { run, verificationViews } = report;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Fracture Lab — ${escape(run.id)}</title><style>body{max-width:1000px;margin:40px auto;padding:0 20px;background:#111317;color:#dde3ed;font:16px system-ui;line-height:1.6}h1{font-size:36px}code,pre,dd{font-size:12px;white-space:pre-wrap;overflow-wrap:anywhere}article{border-top:1px solid #343a46;padding:16px 0}strong{color:#c6b3ff}dt{font-weight:bold}dd{margin:0 0 12px}</style></head><body><h1>${escape(run.scenarioTitle)}</h1><p><strong>${escape(run.source)} · ${escape(run.revision)} · ${escape(run.verdict)}</strong></p><p>${escape(run.summary)}</p><p>Gross capture: ${run.capturedMinor} ${escape(run.currency)} minor units. Refunded: ${run.refundedMinor}. The original purchase verdict is preserved.</p>${run.invariants.map(item => `<article><strong>${escape(item.id)} · ${escape(item.verdict)}</strong><h2>${escape(item.name)}</h2><p>${escape(item.reason)}</p></article>`).join("")}${verificationViews.length ? `<section><h2>Generated candidate execution</h2><p>Separate candidate receipts identify the observed execution boundary. These are published product checks, not new sealed context-study results.</p>${verificationViews.map(view => `<article><h3>${escape(view.location)}</h3><p>${escape(view.summary)}</p><dl><dt>Network</dt><dd>${escape(view.network)}</dd><dt>Filesystem</dt><dd>${escape(view.rootFilesystem)}; ${escape(view.referenceFilesystem)}</dd><dt>Lifetime</dt><dd>${escape(view.disposal)}</dd><dt>Candidate SHA-256</dt><dd>${escape(view.candidateHash)}</dd><dt>Public suite SHA-256</dt><dd>${escape(view.suiteHash)}</dd><dt>Runner snapshot SHA-256</dt><dd>${escape(view.snapshotHash)}</dd><dt>Original evidence SHA-256</dt><dd>${escape(view.originalEvidenceSha256)}</dd></dl><p>${view.legacyHiddenFlags ? `${view.legacyHiddenFlags} legacy hidden flags remain in the unchanged raw record. Every check in this pinned suite is public.` : "The original raw record is unchanged."}</p></article>`).join("")}</section>` : ""}<h2>Original evidence and derived presentation</h2><p>The evidence array preserves the stored records, including historical wording and flags. The verificationViews array labels only the recognized published suite and its recorded execution boundary.</p><pre>${escape(JSON.stringify(report, null, 2))}</pre></body></html>`;
}
