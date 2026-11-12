import type { ToolkitInvestigation } from "./investigations";

export interface InvestigationWitness {
  id: string; title: string; scenario: string; sourceHash: string; orderId: string;
  captureCount: number; capturedMinor: number; currency: string;
}
export interface InvestigationView {
  schemaVersion: 1;
  sessionId: string;
  configured: boolean;
  model: string | null;
  reviews: ToolkitInvestigation[];
  witnesses: InvestigationWitness[];
  recovered?: ToolkitInvestigation | null;
}

export function isInvestigation(value: unknown): value is ToolkitInvestigation {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  const witness = row.witness as Record<string, unknown> | null;
  const receipts = row.receiptIds as Record<string, unknown> | null;
  const result = row.result as Record<string, unknown> | null;
  return [row.id, row.runId, row.actionId, row.model].every(item => typeof item === "string")
    && ["queued", "running", "waiting", "completed", "failed", "cancelled"].includes(String(row.status))
    && ["selection", "read", "conclusion", "completed"].includes(String(row.phase))
    && Boolean(witness && [witness.title, witness.scenario, witness.orderId, witness.sourceHash].every(item => typeof item === "string"))
    && Boolean(receipts && [receipts.selection, receipts.read, receipts.conclusion, receipts.result].every(item => typeof item === "string"))
    && Array.isArray(row.availableReceiptIds) && row.availableReceiptIds.every(item => typeof item === "string")
    && (row.result === null || Boolean(result && [result.evidenceId, result.conclusion, result.observedOrderStatus].every(item => typeof item === "string") && Array.isArray(result.uncertainty) && result.uncertainty.every(item => typeof item === "string")));
}

export function isInvestigationView(value: unknown, sessionId: string): value is InvestigationView {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return row.schemaVersion === 1 && row.sessionId === sessionId && typeof row.configured === "boolean"
    && Array.isArray(row.reviews) && row.reviews.every(isInvestigation)
    && (row.recovered === undefined || row.recovered === null || isInvestigation(row.recovered))
    && Array.isArray(row.witnesses) && row.witnesses.every(item => item && typeof item === "object" && [item.id, item.title, item.scenario, item.sourceHash, item.orderId].every(value => typeof value === "string") && Number.isInteger(item.captureCount));
}
