/** Compact, source-free projection of one retained execution report. Reads saved receipts only. */
type Json = Record<string, unknown>;
const record = (value: unknown): Json => value && typeof value === "object" && !Array.isArray(value) ? value as Json : {};
const list = (value: unknown): unknown[] => Array.isArray(value) ? value : [];
const text = (value: unknown, limit: number) => typeof value === "string" ? value.slice(0, limit) : null;
const TRACE_LIMIT = 40;
export function summarizeSourceExecution(report: { job: { id: string; planId: string; planHash: string; importId: string; status: string; errorCode: string | null; cases: { id: string; scenarioId: string; status: string; errorCode: string | null; receiptHash: string | null }[] }; plan: { revisionHash: string; entryPath: string; seed: string; suiteHash: string; runner: { engine: string } }; artifacts: { kind: string; value: unknown }[]; reportHash: string }) {
  const receipts = new Map(report.artifacts.filter(item => item.kind === "executor_receipt").map(item => { const value = record(item.value); return [String(record(value.binding).caseId), value] as const; }));
  const cases = report.job.cases.map(item => {
    const receipt = receipts.get(item.id), observation = record(receipt?.observation), compiler = record(receipt?.compiler), events = list(observation.events).map(record);
    return {
      caseId: item.id, scenarioId: item.scenarioId, status: item.status, errorCode: item.errorCode, receiptHash: item.receiptHash,
      compiler: receipt ? { status: compiler.status ?? null, diagnostics: text(compiler.diagnostics, 4000) } : null,
      assertions: list(receipt?.assertions).map(record).map(assertion => ({ id: assertion.id, passed: assertion.passed })),
      observed: receipt ? { captureCount: observation.captureCount ?? null, capturedMinor: observation.capturedMinor ?? null, fulfillmentCount: observation.fulfillmentCount ?? null, phoneState: observation.phoneState ?? null, authoritativeReads: observation.resourceReads ?? null, thrownCalls: observation.thrown ?? null, reason: observation.reason ?? null } : null,
      invariants: list(observation.invariants).map(record).filter(row => row.verdict !== "not_applicable").map(row => ({ id: row.id, name: row.name, verdict: row.verdict, expected: row.expected, observed: row.observed, reason: row.reason })),
      trace: events.slice(0, TRACE_LIMIT).map(event => ({ lane: event.lane, kind: event.kind, title: text(event.title, 160), identity: event.identity ?? null, ...(event.resourceId ? { resourceId: event.resourceId } : {}), ...(event.requestId ? { requestId: text(event.requestId, 120) } : {}) })),
      traceOmitted: Math.max(0, events.length - TRACE_LIMIT),
      disposal: receipt ? record(receipt.disposal).state ?? null : null,
    };
  });
  return { source: "sample" as const, provider: "local Sample provider model; no PayPal request", jobId: report.job.id, planId: report.job.planId, planHash: report.job.planHash, importId: report.job.importId, revisionHash: report.plan.revisionHash, entryPath: report.plan.entryPath, seed: report.plan.seed, suiteHash: report.plan.suiteHash, runnerEngine: report.plan.runner.engine, status: report.job.status, errorCode: report.job.errorCode, passed: cases.filter(item => item.status === "passed").length, total: cases.length, cases, reportHash: report.reportHash, sourceIncluded: false as const, fullReport: "export_source_execution returns the complete private source-bearing report." };
}
