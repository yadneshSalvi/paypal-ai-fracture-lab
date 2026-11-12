import type { PublishedObservationResult } from "../../../packages/ai/src/published-observation";

/** Compact, serializable view of the retained PayPal Sandbox record. Every value is read from the verified archive. */
export type JudgeRecordedCapture = { id: string; orderId: string; amountMinor: number; observedAt: string };
export type JudgeRecorded = {
  pairs: number; observedAt: string; sha256: string; checksPassed: number; checks: number; faultSource: string; limitations: string[];
  faulty: { runId: string; captures: JudgeRecordedCapture[]; refunds: { id: string; captureId: string; amountMinor: number; observedAt: string }[]; fulfillments: number; grossMinor: number };
  hardened: { runId: string; captures: JudgeRecordedCapture[]; fulfillments: number; grossMinor: number };
};

export function judgeRecorded(result: PublishedObservationResult): JudgeRecorded | null {
  if (result.status !== "ready") return null;
  const { record } = result;
  const faultyRuns = record.runs.filter(run => run.revision === "faulty"), hardenedRuns = record.runs.filter(run => run.revision === "hardened");
  const faulty = faultyRuns[0], hardened = hardenedRuns[0];
  if (!faulty || !hardened) return null;
  const capture = (item: (typeof faulty.captures)[number]) => ({ id: item.id, orderId: item.orderId, amountMinor: item.amountMinor, observedAt: item.observedAt });
  return {
    pairs: Math.min(faultyRuns.length, hardenedRuns.length), observedAt: record.observedAt, sha256: result.sha256, checksPassed: record.checks.filter(check => check.passed).length, checks: record.checks.length, faultSource: record.faultSource, limitations: record.limitations,
    faulty: { runId: faulty.id, captures: faulty.captures.map(capture), refunds: faulty.refunds.map(refund => ({ id: refund.id, captureId: refund.captureId, amountMinor: refund.amountMinor, observedAt: refund.observedAt })), fulfillments: record.summary.baseline.fulfillments, grossMinor: record.summary.baseline.grossMinor },
    hardened: { runId: hardened.id, captures: hardened.captures.map(capture), fulfillments: record.summary.control.fulfillments, grossMinor: record.summary.control.grossMinor },
  };
}
