import type { LabStore } from "../../service/src/store";
import { LabError } from "../../service/src/errors";
import type { EvidenceDTO } from "@fracture/contracts";

export interface RuntimeAttempt {
  id: string; runId: string | null; role: string; provider: "OpenAI" | "Gemini"; model: string;
  status: "running" | "completed" | "failed" | "cancelled"; startedAt: string | null; durationMs: number | null;
  errorCode: string | null; responseId: string | null; evidenceId: string | null; inputHash: string | null; requestHash: string | null;
  inputTokens: number | null; outputTokens: number | null; background: boolean; continuationFrom: string | null;
  privateContextStored: boolean; retainedOutputItems: number | null;
  transport: { phase: string; httpStatus: number | null; endpoint: string; requestId: string | null; durationMs: number | null; responseBytes: number | null; responseSha256: string | null; nativeCodes: string[]; headersTimeoutMs: number | null; bodyTimeoutMs: number | null; node: string | null; dispatcher: string | null } | null;
}
export interface RuntimeRead { id: string; runId: string | null; title: string; summary: string; kind: "sdk" | "toolkit" | "run"; operation: string; orderId: string | null; observedStatus: string | null; sha256: string; createdAt: string }
export interface RuntimeView { schemaVersion: 1; sessionId: string; observedAt: string; attempts: RuntimeAttempt[]; reads: RuntimeRead[]; totalAttempts: number; truncated: boolean }
const object = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
const text = (value: unknown, maximum = 200): string | null => typeof value === "string" && value.length <= maximum ? value : null;
const number = (value: unknown): number | null => typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
const hash = (value: unknown): string | null => typeof value === "string" && /^[a-f0-9]{64}$/.test(value) ? value : null;

/** Public projection is an allowlist. Never serialize the request, response, or context row. */
export async function modelRuntimeView(store: LabStore, sessionId: string): Promise<RuntimeView> {
  if (!(await store.session(sessionId))) throw new LabError("SESSION_EXPIRED", "The workspace session has expired. Its original records remain retained.", 401);
  const postgres = store.db.dialect === "postgres";
  const field = (path: string) => postgres ? `document::jsonb #> '{${path.split(".").join(",")}}'` : `json_extract(document, '$.${path}')`;
  const jsonObject = (fields: Record<string, string>) => `${postgres ? "jsonb_build_object" : "json_object"}(${Object.entries(fields).map(([name, expression]) => `'${name}',${expression}`).join(",")})`;
  const usage = (path: string) => jsonObject(Object.fromEntries(["input_tokens", "output_tokens", "total_input_tokens", "total_output_tokens"].map(name => [name, field(`${path}.${name}`)])));
  const response = (path: string) => jsonObject({ id: field(`${path}.id`), model: field(`${path}.model`), usage: usage(`${path}.usage`) });
  const responseChoice = jsonObject({
    id: `COALESCE(${["response.id", "receipt.response.id", "providerResponse.id"].map(field).join(",")})`,
    model: `COALESCE(${["response.model", "receipt.response.model", "providerResponse.model"].map(field).join(",")})`,
    usage: jsonObject(Object.fromEntries(["input_tokens", "output_tokens", "total_input_tokens", "total_output_tokens"].map(name => [name, `COALESCE(${[`response.usage.${name}`, `receipt.response.usage.${name}`, `providerResponse.usage.${name}`].map(field).join(",")})`]))),
  });
  const latestTransport = postgres ? "(document::jsonb->'transports')->-1" : "json_extract(document,'$.transports[#-1]')";
  const projection = jsonObject({ ...Object.fromEntries(["provider", "model", "startedAt", "durationMs", "errorCode", "responseId", "inputHash", "requestHash", "context"].map(name => [name, field(name)])), continuationFrom: `COALESCE(${field("continuationFrom")},${field("request.continuationFrom")})`, response: responseChoice, receipt: jsonObject({ evidenceId: field("receipt.evidenceId"), durationMs: field("receipt.durationMs"), response: response("receipt.response") }), transport: `COALESCE(${field("transport")},${latestTransport})` });
  const started = postgres ? "document::jsonb->>'startedAt'" : "json_extract(document,'$.startedAt')";
  const title = postgres ? "document::jsonb->>'title'" : "json_extract(document,'$.title')";
  const [rows, count, tools, ids] = await Promise.all([
    store.db.query<{ id: string; run_id: string | null; role: string; status: string; document: string } & Record<string, unknown>>(`SELECT id,run_id,role,status,${postgres ? `(${projection})::text` : projection} AS document FROM lab_model_attempts WHERE session_id=$1 ORDER BY ${started} DESC,id LIMIT 200`, [sessionId]),
    store.db.query<{ count: number | string } & Record<string, unknown>>("SELECT COUNT(*) AS count FROM lab_model_attempts WHERE session_id=$1", [sessionId]),
    store.db.query<{ document: string } & Record<string, unknown>>(`SELECT document FROM lab_evidence WHERE session_id=$1 AND ${title} IN ('Model-selected read-only experiment','Model-selected Toolkit order read') ORDER BY created_at DESC LIMIT 100`, [sessionId]),
    store.db.query<{ id: string } & Record<string, unknown>>("SELECT id FROM lab_evidence WHERE session_id=$1", [sessionId]),
  ]);
  const evidence = tools.rows.map(row => JSON.parse(row.document) as EvidenceDTO);
  const evidenceIds = new Set(ids.rows.map(item => item.id));
  const attempts: RuntimeAttempt[] = rows.rows.map<RuntimeAttempt>(row => {
    let record: Record<string, unknown> = {};
    try { record = object(JSON.parse(row.document)); } catch { /* A damaged record remains a retained failure, without exposing its bytes. */ }
    const receipt = object(record.receipt);
    const response = object(record.response ?? receipt.response ?? record.providerResponse);
    const usage = object(response.usage);
    const context = object(record.context);
    const transports = Array.isArray(record.transports) ? record.transports : [];
    const transport = object(record.transport ?? transports.at(-1));
    const limits = object(transport.limits);
    const nativeCodes: string[] = [];
    let exception = object(transport.exception);
    for (let depth = 0; depth < 4 && Object.keys(exception).length; depth++) {
      const code = text(exception.code, 80);
      if (code && /^[A-Za-z0-9_]+$/.test(code)) nativeCodes.push(code);
      exception = object(exception.cause);
    }
    const endpoint = text(transport.endpoint, 850);
    const safeEndpoint = endpoint && /^https:\/\/(api\.openai\.com\/v1\/responses|generativelanguage\.googleapis\.com\/v1beta\/interactions)(?:\/[A-Za-z0-9_-]{1,600})?(?:\/cancel)?$/.test(endpoint) ? endpoint : null;
    const evidenceId = text(receipt.evidenceId) ?? row.id;
    return {
      id: row.id, runId: row.run_id, role: row.role, provider: record.provider === "gemini" ? "Gemini" : "OpenAI", model: text(response.model) ?? text(record.model) ?? "Unreported model",
      status: ["running", "completed", "cancelled"].includes(row.status) ? row.status as RuntimeAttempt["status"] : "failed",
      startedAt: text(record.startedAt), durationMs: number(record.durationMs ?? receipt.durationMs), errorCode: text(record.errorCode, 120), responseId: text(response.id ?? record.responseId, 600), evidenceId: evidenceIds.has(evidenceId) ? evidenceId : null,
      inputHash: hash(record.inputHash), requestHash: hash(record.requestHash), inputTokens: number(usage.input_tokens ?? usage.total_input_tokens), outputTokens: number(usage.output_tokens ?? usage.total_output_tokens),
      background: typeof record.responseId === "string" && record.provider !== "gemini", continuationFrom: text(record.continuationFrom), privateContextStored: context.storage === "encrypted_server_only", retainedOutputItems: number(context.retainedOutputItems),
      transport: safeEndpoint ? { phase: text(transport.phase) ?? "unreported", httpStatus: number(transport.httpStatus), endpoint: safeEndpoint, requestId: text(transport.requestId), durationMs: number(transport.durationMs), responseBytes: number(transport.responseBytes), responseSha256: hash(transport.responseSha256), nativeCodes, headersTimeoutMs: number(limits.headersTimeoutMs), bodyTimeoutMs: number(limits.bodyTimeoutMs), node: text(transport.node), dispatcher: text(transport.dispatcherUndici) } : null,
    };
  }).sort((a, b) => (b.startedAt ?? "").localeCompare(a.startedAt ?? "") || a.id.localeCompare(b.id));
  const reads: RuntimeRead[] = evidence.filter(item => item.source === "sample" && (item.title === "Model-selected read-only experiment" || item.title === "Model-selected Toolkit order read")).map(item => {
    const body = item.body;
    const kind = body.package === "@paypal/agent-toolkit" ? "toolkit" : object(body.integration).package === "paypal" ? "sdk" : "run";
    const resource = Array.isArray(body.resources) ? body.resources.map(object).find(resource => resource.kind === "order") : null;
    return { id: item.id, runId: item.runId, title: item.title, summary: item.summary, kind, operation: kind === "toolkit" ? "@paypal/agent-toolkit · get_order" : text(body.transport, 180) ?? "Scoped run read", orderId: text(body.orderId), observedStatus: text(object(body.observed).status ?? resource?.status), sha256: item.sha256, createdAt: item.createdAt };
  });
  const totalAttempts = Number(count.rows[0]?.count ?? 0);
  return { schemaVersion: 1, sessionId, observedAt: new Date().toISOString(), attempts, reads, totalAttempts, truncated: totalAttempts > attempts.length };
}
