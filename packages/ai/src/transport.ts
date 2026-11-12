import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { Agent } from "undici";

// Already pinned by the original lockfile. No frozen study dependency changes.
const installedUndici = String(createRequire(import.meta.url)("undici/package.json").version);

export interface ModelTransportLimits {
  connectTimeoutMs: number;
  headersTimeoutMs: number;
  bodyTimeoutMs: number;
  maximumResponseBytes: number;
}
export const modelTransportLimits: Readonly<ModelTransportLimits> = Object.freeze({
  connectTimeoutMs: 20_000,
  headersTimeoutMs: 900_000,
  bodyTimeoutMs: 900_000,
  maximumResponseBytes: 8_000_000,
});

export interface TransportException {
  name: string | null;
  code: string | null;
  cause: TransportException | null;
}
export interface ModelTransportReceipt {
  schemaVersion: 1;
  transport: "fetch_with_per_request_undici_agent";
  node: string;
  bundledUndici: string | null;
  dispatcherUndici: string;
  endpoint: string;
  method: string;
  startedAt: string;
  headersAt: string | null;
  finishedAt: string | null;
  durationMs: number;
  phase: "dispatching" | "reading_body" | "completed" | "consumer_cancelled" | "failed";
  httpStatus: number | null;
  requestId: string | null;
  contentType: string | null;
  responseBytes: number;
  responseSha256: string | null;
  exception: TransportException | null;
  limits: ModelTransportLimits;
  automaticRetries: 0;
  globalDispatcherChanged: false;
}

const receipts = new WeakMap<object, ModelTransportReceipt>();
const snapshot = (receipt: ModelTransportReceipt): ModelTransportReceipt => structuredClone(receipt);

/** Native names/codes are diagnostic evidence; arbitrary error messages are not public data. */
export function transportException(error: unknown, depth = 0, seen = new Set<unknown>()): TransportException | null {
  if (!error || typeof error !== "object" || depth >= 4 || seen.has(error)) return null;
  seen.add(error);
  const value = error as { name?: unknown; code?: unknown; cause?: unknown };
  const safe = (item: unknown) => typeof item === "string" && /^[A-Za-z0-9_]{1,80}$/.test(item) ? item : null;
  return { name: safe(value.name), code: safe(value.code), cause: transportException(value.cause, depth + 1, seen) };
}

export class ModelTransportError extends Error {
  constructor(readonly code: string, readonly transport: ModelTransportReceipt) {
    super("The provider transport did not complete. Its exact attempt is retained.");
    this.name = "ModelTransportError";
  }
}

export function modelTransportReceipt(value: unknown): ModelTransportReceipt | null {
  if (value instanceof ModelTransportError) return snapshot(value.transport);
  if (!value || typeof value !== "object") return null;
  const receipt = receipts.get(value);
  return receipt ? snapshot(receipt) : null;
}

function target(input: RequestInfo | URL, init?: RequestInit) {
  const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
  const method = (init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase();
  const openai = url.hostname === "api.openai.com";
  const gemini = url.hostname === "generativelanguage.googleapis.com";
  const base = openai ? "/v1/responses" : "/v1beta/interactions";
  const create = method === "POST" && url.pathname === base;
  const read = method === "GET" && new RegExp(`^${base}/[A-Za-z0-9_-]{1,600}$`).test(url.pathname);
  const cancel = method === "POST" && new RegExp(`^${base}/[A-Za-z0-9_-]{1,600}/cancel$`).test(url.pathname);
  const queries = openai ? new Set(["stream", "starting_after"]) : new Set(["stream", "last_event_id"]);
  if (url.protocol !== "https:" || url.port || url.username || url.password || url.hash || (!openai && !gemini)
      || (!create && !read && !cancel) || [...url.searchParams.keys()].some(key => !read || !queries.has(key))) {
    throw new Error("The model endpoint is outside the fixed provider allowlist.");
  }
  return { url, method };
}

/**
 * Each call owns its dispatcher. AbortSignal remains the whole-request bound;
 * explicit parser timeouts prevent the unrelated five-minute fetch defaults.
 * This adapter never retries a create or changes the process-wide dispatcher.
 */
export function createModelTransport(options: {
  limits?: Partial<ModelTransportLimits>;
  fetchImpl?: typeof fetch;
} = {}): typeof fetch {
  const limits = { ...modelTransportLimits, ...options.limits };
  for (const value of Object.values(limits)) if (!Number.isSafeInteger(value) || value < 1) throw new Error("Model transport limits must be positive integers.");
  const fetchImpl = options.fetchImpl ?? fetch;
  return async (input, init) => {
    const { url, method } = target(input, init);
    const started = Date.now();
    const receipt: ModelTransportReceipt = {
      schemaVersion: 1, transport: "fetch_with_per_request_undici_agent", node: process.version,
      bundledUndici: process.versions.undici ?? null, dispatcherUndici: installedUndici,
      endpoint: url.href, method, startedAt: new Date(started).toISOString(), headersAt: null,
      finishedAt: null, durationMs: 0, phase: "dispatching", httpStatus: null, requestId: null,
      contentType: null, responseBytes: 0, responseSha256: null, exception: null,
      limits: { ...limits }, automaticRetries: 0, globalDispatcherChanged: false,
    };
    const agent = new Agent({ connectTimeout: limits.connectTimeoutMs, headersTimeout: limits.headersTimeoutMs, bodyTimeout: limits.bodyTimeoutMs });
    let closed = false;
    const close = async () => { if (!closed) { closed = true; await agent.close().catch(() => {}); } };
    const fail = (error: unknown, code = "MODEL_TRANSPORT_UNKNOWN") => {
      receipt.phase = "failed";
      receipt.finishedAt = new Date().toISOString();
      receipt.durationMs = Date.now() - started;
      receipt.exception = transportException(error);
      return new ModelTransportError(code, snapshot(receipt));
    };
    let response: Response;
    try {
      response = await fetchImpl(input, { ...init, redirect: "error", dispatcher: agent } as RequestInit);
    } catch (error) {
      const failure = fail(error);
      await agent.destroy().catch(() => {}); closed = true;
      throw failure;
    }
    receipt.headersAt = new Date().toISOString();
    receipt.durationMs = Date.now() - started;
    receipt.httpStatus = response.status;
    const requestId = response.headers.get("x-request-id") ?? response.headers.get("x-goog-request-id");
    receipt.requestId = requestId && /^[A-Za-z0-9_-]{1,200}$/.test(requestId) ? requestId : null;
    const contentType = response.headers.get("content-type");
    receipt.contentType = contentType && /^[A-Za-z0-9_+./;= -]{1,150}$/.test(contentType) ? contentType : null;
    if (!response.body) {
      receipt.phase = "completed"; receipt.finishedAt = new Date().toISOString();
      receipt.responseSha256 = createHash("sha256").digest("hex");
      receipts.set(response, receipt); await close(); return response;
    }
    receipt.phase = "reading_body";
    const reader = response.body.getReader();
    const hash = createHash("sha256");
    let settled = false;
    const release = () => { try { reader.releaseLock(); } catch { /* Cancellation may own the pending read. */ } };
    const body = new ReadableStream<Uint8Array>({
      async pull(controller) {
        if (settled) return;
        try {
          const { done, value } = await reader.read();
          if (settled) return;
          if (done) {
            settled = true;
            receipt.phase = "completed"; receipt.finishedAt = new Date().toISOString();
            receipt.durationMs = Date.now() - started; receipt.responseSha256 = hash.digest("hex");
            release(); controller.close(); await close(); return;
          }
          receipt.responseBytes += value.byteLength;
          if (receipt.responseBytes > limits.maximumResponseBytes) {
            const error = Object.assign(new Error(), { name: "ResponseLimitError", code: "MODEL_RESPONSE_LIMIT" });
            const failure = fail(error, "MODEL_RESPONSE_LIMIT");
            settled = true;
            await reader.cancel().catch(() => {}); release();
            controller.error(failure); await close(); return;
          }
          hash.update(value); controller.enqueue(value);
        } catch (error) {
          if (settled) return;
          settled = true;
          const failure = fail(error);
          release(); controller.error(failure); await close();
        }
      },
      async cancel(reason) {
        if (settled) return;
        settled = true;
        receipt.phase = "consumer_cancelled"; receipt.finishedAt = new Date().toISOString();
        receipt.durationMs = Date.now() - started;
        // A caller may stop after a terminal SSE event; a prefix is not a full body hash.
        receipt.responseSha256 = null;
        await reader.cancel(reason).catch(() => {}); release(); await close();
      },
    });
    const wrapped = new Response(body, { status: response.status, statusText: response.statusText, headers: response.headers });
    receipts.set(wrapped, receipt);
    return wrapped;
  };
}

export const fetchModelProvider = createModelTransport();
