import { canonicalJson, sha256 } from "@fracture/paypal-core";
import type { EvidenceDTO } from "@fracture/contracts";
import { LabStore } from "../../service/src/store";
import { LabError } from "../../service/src/errors";
import { requiredConfig } from "../../service/src/config";
import { ModelContextVault } from "./context-vault";
import { modelAttemptIdentity, OpenAIModel } from "./model";
import type { ModelOutput } from "./model";
import { fetchModelProvider, modelTransportReceipt, ModelTransportError } from "./transport";

export interface GeminiStep extends Record<string, unknown> { type: string; id?: string; name?: string; arguments?: unknown; content?: { type: string; text?: string }[] }
export interface GeminiResponse { id: string; model: string; status: string; steps: GeminiStep[]; usage?: Record<string, unknown> }
export interface GeminiCall {
  role: string; model: string; instructions: string; input: unknown;
  tools?: Record<string, unknown>[]; toolName?: string; schema?: Record<string, unknown>;
  continuation?: { attemptId: string; results: { callId: string; name: string; output: unknown }[] };
}
export interface GeminiReceipt { attemptId: string; evidenceId: string; response: GeminiResponse; durationMs: number; inputHash: string }
const publicResponse = (response: GeminiResponse): GeminiResponse => ({
  id: response.id, model: response.model, status: response.status,
  steps: response.steps.flatMap<GeminiStep>(step => step.type === "function_call"
    ? [{ type: step.type, ...(typeof step.id === "string" ? { id: step.id } : {}), ...(typeof step.name === "string" ? { name: step.name } : {}), arguments: step.arguments }]
    : step.type === "model_output" ? [{ type: step.type, content: (step.content ?? []).filter(part => part.type === "text" && typeof part.text === "string").map(part => ({ type: "text", text: part.text! })) }] : []),
  ...(response.usage ? { usage: response.usage } : {}),
});

/** Gemini's saved interaction ID retains opaque thought state; it is never reconstructed. */
export class GeminiInteractionModel {
  private authority: OpenAIModel;
  constructor(private store: LabStore, readonly actionId: string, private fetchImpl: typeof fetch = fetchModelProvider) {
    if (fetchImpl === globalThis.fetch) this.fetchImpl = fetchModelProvider;
    this.authority = new OpenAIModel(store, this.fetchImpl, actionId);
  }
  async call(sessionId: string, runId: string, call: GeminiCall): Promise<GeminiReceipt> {
    await this.authority.assertActive(sessionId);
    let previous: string | null = null;
    let toolInput: Record<string, unknown>[] = [];
    if (call.continuation) {
      const row = (await this.store.db.query<{ document: string; run_id: string } & Record<string, unknown>>("SELECT document,run_id FROM lab_model_attempts WHERE id=$1 AND session_id=$2 AND status='completed'", [call.continuation.attemptId, sessionId])).rows[0];
      const prior = row ? JSON.parse(row.document) as { provider?: string; receipt?: GeminiReceipt } : null;
      const response = prior?.receipt?.response;
      const calls = response?.steps.filter(step => step.type === "function_call") ?? [];
      const results = call.continuation.results;
      if (row?.run_id !== runId || prior?.provider !== "gemini" || response?.model !== call.model || !calls.length || calls.length !== results.length || new Set(results.map(result => result.callId)).size !== results.length || results.some(result => calls.filter(step => step.id === result.callId && step.name === result.name).length !== 1)) throw new LabError("MODEL_CONTEXT_DENIED", "The continuation must answer every original tool call for this session and run.", 403);
      previous = response.id;
      toolInput = calls.map(step => ({ type: "function_result", name: step.name, call_id: step.id, result: [{ type: "text", text: JSON.stringify(results.find(result => result.callId === step.id)!.output) }] }));
    }
    const input = [...toolInput, { type: "text", text: JSON.stringify(call.input) }];
    const request = {
      model: call.model, system_instruction: call.instructions, input, store: true,
      tools: call.tools ?? [],
      generation_config: { thinking_level: "high", thinking_summaries: "none", max_output_tokens: 32768, ...(call.toolName ? { tool_choice: { allowed_tools: { mode: "any", tools: [call.toolName] } } } : { tool_choice: "none" }) },
      ...(call.schema ? { response_format: { type: "text", mime_type: "application/json", schema: call.schema } } : {}),
      ...(previous ? { previous_interaction_id: previous } : {}),
    };
    const attemptId = modelAttemptIdentity(sessionId, this.actionId, call.role);
    const inputHash = sha256(canonicalJson(call));
    const requestHash = sha256(canonicalJson(request));
    const started = Date.now();
    const record = { attemptId, actionId: this.actionId, role: call.role, provider: "gemini", model: call.model, inputHash, requestHash, startedAt: new Date(started).toISOString(), status: "running", previousInteractionId: previous, continuationFrom: call.continuation?.attemptId ?? null, configuration: { thinkingLevel: "high", storedInteraction: true, apiRevision: "2026-05-20" } };
    const inserted = await this.store.db.query("INSERT INTO lab_model_attempts(id,session_id,run_id,role,status,document) VALUES($1,$2,$3,$4,'running',$5) ON CONFLICT(id) DO NOTHING", [attemptId, sessionId, runId, call.role, JSON.stringify(record)]);
    if (inserted.rowCount !== 1) {
      const row = (await this.store.db.query<{ document: string; session_id: string; run_id: string } & Record<string, unknown>>("SELECT document,session_id,run_id FROM lab_model_attempts WHERE id=$1", [attemptId])).rows[0];
      const saved = row ? JSON.parse(row.document) as typeof record & { receipt?: GeminiReceipt; errorCode?: string } : null;
      if (row?.session_id !== sessionId || row.run_id !== runId || saved?.requestHash !== requestHash || saved.inputHash !== inputHash) throw new LabError("MODEL_CHECKPOINT_CONFLICT", "This action already belongs to different model input.", 409);
      if (saved.status === "completed" && saved.receipt) return saved.receipt;
      throw new LabError(saved.errorCode ?? "MODEL_DISPATCH_UNKNOWN", "The original Gemini attempt is retained. An uncertain create is never sent again.", 503);
    }
    const vault = new ModelContextVault(this.store.db);
    const cancel = new AbortController();
    const timer = setInterval(() => { void this.authority.assertActive(sessionId).catch(() => cancel.abort()); }, 1500);
    let response: Response | null = null;
    let observedResponse: GeminiResponse | null = null;
    try {
      await vault.prepare(attemptId, sessionId, runId, request);
      response = await this.fetchImpl("https://generativelanguage.googleapis.com/v1beta/interactions", { method: "POST", headers: { "content-type": "application/json", "x-goog-api-key": requiredConfig("GEMINI_API_KEY"), "Api-Revision": "2026-05-20" }, body: JSON.stringify(request), signal: AbortSignal.any([AbortSignal.timeout(900_000), cancel.signal]) });
      if (!response.ok) { await response.arrayBuffer().catch(() => {}); throw new LabError(`MODEL_HTTP_${response.status}`, "Gemini did not return a usable interaction. The original attempt is retained.", 502); }
      const raw = await response.json() as GeminiResponse;
      if (typeof raw.id !== "string" || raw.id.length > 600 || typeof raw.model !== "string" || raw.model.replace(/^models\//, "") !== call.model || !Array.isArray(raw.steps) || raw.steps.some(step => !step || typeof step.type !== "string")) throw new LabError("MODEL_RESPONSE_INVALID", "The interaction identity or model does not match the declared request.", 502);
      const context = await vault.retainResponse(attemptId, sessionId, runId, { id: raw.id, model: raw.model, status: raw.status, output: raw.steps as ModelOutput[], ...(raw.usage ? { usage: raw.usage } : {}) });
      observedResponse = publicResponse({ ...raw, model: call.model });
      if (!["completed", "requires_action"].includes(raw.status)) throw new LabError("MODEL_INCOMPLETE", "The interaction did not yield a completed answer or declared tool call.", 502);
      const observed = observedResponse;
      const durationMs = Date.now() - started;
      const transport = modelTransportReceipt(response);
      const receipt: GeminiReceipt = { attemptId, evidenceId: attemptId, response: observed, durationMs, inputHash };
      const body = { ...record, status: "completed", response: observed, context, transport, durationMs, provenance: "model_generated", provider: "Gemini Interactions API" };
      const evidence: EvidenceDTO = { id: attemptId, runId, title: `Model receipt · ${call.role}`, kind: "receipt", source: "sample", createdAt: new Date().toISOString(), sha256: sha256(canonicalJson(body)), summary: "An actual Gemini interaction using scoped Sample evidence. Model output is distinct from the observed tool result.", body, redactions: ["Provider credentials and thought/signature items are excluded.", "Exact raw response context is encrypted on this server; opaque continuation remains bound to the original saved provider interaction."] };
      await this.store.db.transaction(async tx => {
        const action = (await tx.query<{ stage: string } & Record<string, unknown>>("SELECT stage FROM lab_actions WHERE id=$1 AND session_id=$2 FOR UPDATE", [this.actionId, sessionId])).rows[0];
        if (cancel.signal.aborted || action?.stage !== "running") throw new LabError("WORK_CANCELLED", "The original model action is no longer active.", 409);
        await tx.query("INSERT INTO lab_evidence(id,session_id,run_id,created_at,document) VALUES($1,$2,$3,$4,$5)", [attemptId, sessionId, runId, evidence.createdAt, JSON.stringify(evidence)]);
        await tx.query("UPDATE lab_model_attempts SET status='completed',document=$2 WHERE id=$1", [attemptId, JSON.stringify({ ...record, status: "completed", receipt, context, transport, durationMs })]);
      });
      return receipt;
    } catch (error) {
      const code = cancel.signal.aborted ? "WORK_CANCELLED" : error instanceof LabError || error instanceof ModelTransportError ? error.code : "MODEL_TRANSPORT_FAILURE";
      await this.store.db.query("UPDATE lab_model_attempts SET status='failed',document=$2 WHERE id=$1", [attemptId, JSON.stringify({ ...record, status: "failed", errorCode: code, durationMs: Date.now() - started, providerResponse: observedResponse, transport: modelTransportReceipt(error) ?? modelTransportReceipt(response) })]);
      if (error instanceof LabError) throw error;
      throw new LabError(code, "The original Gemini attempt did not complete. No replacement result is presented.", 502);
    } finally { clearInterval(timer); await response?.body?.cancel().catch(() => {}); }
  }
}

export function geminiOutputJson(response: GeminiResponse): unknown {
  const text = response.steps.filter(step => step.type === "model_output").flatMap(step => step.content ?? []).filter(part => part.type === "text").map(part => part.text ?? "").join("");
  if (!text || text.length > 100_000) throw new LabError("MODEL_SCHEMA", "The interaction returned no bounded structured answer.", 502);
  try { return JSON.parse(text); } catch { throw new LabError("MODEL_SCHEMA", "The interaction's structured answer could not be parsed.", 502); }
}
