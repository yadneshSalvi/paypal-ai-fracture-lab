import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { canonicalJson, sha256 } from "@fracture/paypal-core";
import type { SqlDatabase } from "@fracture/paypal-core";
import { requiredConfig } from "../../service/src/config";
import { LabError } from "../../service/src/errors";
import type { ModelResponse } from "./model";

export interface ToolContinuation {
  attemptId: string;
  toolOutputs: { callId: string; output: unknown }[];
}
interface Exchange {
  schemaVersion: 1;
  request: Record<string, unknown> & { input: unknown[]; model: string };
  response: ModelResponse | null;
}
interface Envelope {
  version: 1;
  algorithm: "aes-256-gcm";
  iv: string;
  ciphertext: string;
  tag: string;
  plaintextSha256: string;
}
type Row = { document: string; session_id: string; run_id: string | null } & Record<string, unknown>;
const initialized = new WeakMap<SqlDatabase, Promise<void>>();
const maximumBytes = 16_000_000;

/** Server-only storage. No evidence, export or browser reader selects this table. */
export class ModelContextVault {
  constructor(private db: SqlDatabase) {}

  private async ready() {
    let pending = initialized.get(this.db);
    if (!pending) {
      pending = this.db.query("CREATE TABLE IF NOT EXISTS lab_model_contexts(id TEXT PRIMARY KEY,session_id TEXT NOT NULL,run_id TEXT,document TEXT NOT NULL)").then(() => {});
      initialized.set(this.db, pending);
      pending.catch(() => initialized.delete(this.db));
    }
    await pending;
  }

  private key() {
    return createHash("sha256").update("fracture-model-context-v1\0").update(requiredConfig("JUDGE_SESSION_SECRET")).digest();
  }

  private aad(id: string, sessionId: string, runId: string | null) {
    return Buffer.from(canonicalJson({ table: "lab_model_contexts", id, sessionId, runId }));
  }

  private seal(id: string, sessionId: string, runId: string | null, exchange: Exchange): string {
    const plaintext = Buffer.from(JSON.stringify(exchange));
    if (plaintext.byteLength > maximumBytes) throw new LabError("MODEL_CONTEXT_LIMIT", "The private model context exceeded its bounded size.", 422);
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", this.key(), iv);
    cipher.setAAD(this.aad(id, sessionId, runId));
    const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    const envelope: Envelope = { version: 1, algorithm: "aes-256-gcm", iv: iv.toString("base64url"), ciphertext: encrypted.toString("base64url"), tag: cipher.getAuthTag().toString("base64url"), plaintextSha256: sha256(plaintext.toString()) };
    return JSON.stringify(envelope);
  }

  private open(id: string, sessionId: string, runId: string | null, document: string): Exchange {
    try {
      if (document.length > maximumBytes * 1.5) throw new Error("limit");
      const value = JSON.parse(document) as Envelope;
      if (value.version !== 1 || value.algorithm !== "aes-256-gcm") throw new Error("version");
      const iv = Buffer.from(value.iv, "base64url");
      const tag = Buffer.from(value.tag, "base64url");
      if (iv.byteLength !== 12 || tag.byteLength !== 16) throw new Error("envelope");
      const decipher = createDecipheriv("aes-256-gcm", this.key(), iv);
      decipher.setAAD(this.aad(id, sessionId, runId));
      decipher.setAuthTag(tag);
      const plaintext = Buffer.concat([decipher.update(Buffer.from(value.ciphertext, "base64url")), decipher.final()]).toString();
      if (sha256(plaintext) !== value.plaintextSha256) throw new Error("digest");
      const exchange = JSON.parse(plaintext) as Exchange;
      if (exchange.schemaVersion !== 1 || !Array.isArray(exchange.request.input)) throw new Error("shape");
      return exchange;
    } catch {
      throw new LabError("MODEL_CONTEXT_UNREADABLE", "The retained private context could not be authenticated. No replacement model call was sent.", 409);
    }
  }

  async prepare(id: string, sessionId: string, runId: string | null, request: Exchange["request"]) {
    await this.ready();
    const document = this.seal(id, sessionId, runId, { schemaVersion: 1, request, response: null });
    await this.db.query("INSERT INTO lab_model_contexts(id,session_id,run_id,document) VALUES($1,$2,$3,$4)", [id, sessionId, runId, document]);
  }

  async retainResponse(id: string, sessionId: string, runId: string | null, response: ModelResponse) {
    await this.ready();
    const row = (await this.db.query<Row>("SELECT document,session_id,run_id FROM lab_model_contexts WHERE id=$1 AND session_id=$2", [id, sessionId])).rows[0];
    if (!row || row.run_id !== runId) throw new LabError("MODEL_CONTEXT_MISSING", "The request's private context is unavailable.", 409);
    const exchange = this.open(id, sessionId, runId, row.document);
    if (exchange.response) throw new LabError("MODEL_CONTEXT_RECORDED", "The provider response is already retained and cannot be replaced.", 409);
    await this.db.query("UPDATE lab_model_contexts SET document=$3 WHERE id=$1 AND session_id=$2", [id, sessionId, this.seal(id, sessionId, runId, { ...exchange, response })]);
    return {
      requestSha256: sha256(canonicalJson(exchange.request)),
      responseSha256: sha256(canonicalJson(response)),
      originalInputItems: exchange.request.input.length,
      retainedOutputItems: response.output.length,
      encryptedReasoningItems: response.output.filter(item => item.type === "reasoning" && typeof item.encrypted_content === "string").length,
      storage: "encrypted_server_only" as const,
    };
  }

  async continuation(sessionId: string, runId: string | null, model: string, continuation: ToolContinuation): Promise<unknown[]> {
    await this.ready();
    const row = (await this.db.query<Row>("SELECT c.document,c.session_id,c.run_id FROM lab_model_contexts c JOIN lab_model_attempts a ON a.id=c.id AND a.session_id=c.session_id WHERE c.id=$1 AND c.session_id=$2 AND a.status='completed'", [continuation.attemptId, sessionId])).rows[0];
    if (!row || row.run_id !== runId) throw new LabError("MODEL_CONTEXT_DENIED", "A continuation requires this session's completed response for the same run.", 403);
    const exchange = this.open(continuation.attemptId, sessionId, runId, row.document);
    if (!exchange.response || exchange.response.status !== "completed" || exchange.request.model !== model) throw new LabError("MODEL_CONTEXT_CONFLICT", "The continuation does not match the completed model request.", 409);
    const calls = exchange.response.output.filter(item => item.type === "function_call");
    const outputs = continuation.toolOutputs;
    if (!calls.length || calls.some(call => typeof call.call_id !== "string") || outputs.length !== calls.length || new Set(outputs.map(item => item.callId)).size !== outputs.length || outputs.some(output => calls.filter(call => call.call_id === output.callId).length !== 1)) {
      throw new LabError("MODEL_TOOL_CONTINUATION", "Each original tool call needs exactly one matching result. No continuation was sent.", 422);
    }
    // Keep the original input and every provider output item in their original order.
    // Encrypted reasoning remains opaque; never summarize, reconstruct or publish it.
    return structuredClone([
      ...exchange.request.input,
      ...exchange.response.output,
      ...calls.map(call => ({ type: "function_call_output", call_id: call.call_id, output: JSON.stringify(outputs.find(output => output.callId === call.call_id)!.output) })),
    ]);
  }
}
