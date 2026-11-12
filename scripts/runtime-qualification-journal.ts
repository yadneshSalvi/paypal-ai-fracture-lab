import { createHash, randomUUID } from "node:crypto";
import { mkdir, open, lstat } from "node:fs/promises";
import { join, resolve } from "node:path";
import { transportException } from "../packages/ai/src/transport";

const digest = (value: string | Uint8Array) => createHash("sha256").update(value).digest("hex");
async function durableFile(path: string, body: string) {
  const file = await open(path, "wx", 0o600);
  try { await file.writeFile(body); await file.sync(); } finally { await file.close(); }
}
async function syncDirectory(path: string) {
  const directory = await open(path, "r");
  try { await directory.sync(); } finally { await directory.close(); }
}

export class JournalDispatchExists extends Error {
  readonly code = "QUALIFICATION_DISPATCH_RETAINED";
  constructor() { super("A provider mutation already has a retained intent. Inspect that exact attempt; do not submit it again."); }
}

/** Private qualification evidence. This module is never imported by the web app. */
export function journaledProviderFetch(options: {
  directory: string;
  namespace: string;
  fetchImpl?: typeof fetch;
}): typeof fetch {
  if (!/^[a-z0-9][a-z0-9_-]{0,79}$/.test(options.namespace)) throw new Error("Invalid journal namespace.");
  const root = resolve(options.directory, options.namespace);
  const dispatch = options.fetchImpl ?? fetch;
  return async (input, init) => {
    const endpoint = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
    const method = (init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase();
    if (!["POST", "GET"].includes(method) || endpoint.username || endpoint.password || !["api.openai.com", "generativelanguage.googleapis.com"].includes(endpoint.hostname)) throw new Error("Journal only accepts the declared provider operations.");
    if (method === "POST" && typeof init?.body !== "string") throw new Error("A provider create requires its exact serializable body.");
    const body = typeof init?.body === "string" ? init.body : "";
    if (Buffer.byteLength(body) > 4_000_000) throw new Error("The provider input exceeds the declared journal bound.");
    const credentials = Object.entries(process.env).filter(([key, value]) => /API_KEY|SECRET|PASSWORD|TOKEN|DATABASE_URL/i.test(key) && value && value.length >= 18).map(([, value]) => value!);
    if (credentials.some(value => body.includes(value))) throw new Error("Private configuration must not enter a provider request body.");
    await mkdir(root, { recursive: true, mode: 0o700 });
    const rootInfo = await lstat(root);
    if (!rootInfo.isDirectory() || rootInfo.isSymbolicLink() || (rootInfo.mode & 0o077) !== 0) throw new Error("The provider journal must be a private real directory.");
    const requestHash = digest(body);
    const slot = method === "GET" ? `read-${randomUUID()}` : `mutation-${digest(`${method}\n${endpoint.href}\n${body}`)}`;
    const directory = join(root, slot);
    try { await mkdir(directory, { mode: 0o700 }); } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "EEXIST") throw new JournalDispatchExists();
      throw error;
    }
    const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
    const started = Date.now();
    const intent = {
      schemaVersion: 1, namespace: options.namespace, slot, method, endpoint: endpoint.href,
      createdAt: new Date(started).toISOString(), requestSha256: requestHash,
      requestBytes: Buffer.byteLength(body), headers: {
        contentType: headers.get("content-type"), apiRevision: headers.get("api-revision"),
      }, mutationAutomaticRetry: false, authenticationRetained: false,
    };
    await durableFile(join(directory, "intent.json"), JSON.stringify(intent, null, 2) + "\n");
    await durableFile(join(directory, "request.json"), body);
    await syncDirectory(directory); await syncDirectory(root);
    const events = await open(join(directory, "events.ndjson"), "wx", 0o600);
    const bytes = await open(join(directory, "response.bin"), "wx", 0o600);
    let sequence = 0;
    let offset = 0;
    let closed = false;
    let settled = false;
    let writing: Promise<void> | null = null;
    const hash = createHash("sha256");
    const event = async (type: string, detail: Record<string, unknown> = {}) => {
      await events.writeFile(JSON.stringify({ sequence: ++sequence, type, at: new Date().toISOString(), elapsedMs: Date.now() - started, ...detail }) + "\n");
      await events.sync();
    };
    const close = async () => { if (closed) return; closed = true; await bytes.close(); await events.close(); };
    let response: Response;
    try {
      await event("dispatch_started");
      response = await dispatch(input, init);
      await event("response_headers", { status: response.status, contentType: response.headers.get("content-type"), requestId: response.headers.get("x-request-id") ?? response.headers.get("x-goog-request-id") });
    } catch (error) {
      await event("dispatch_unknown", { exception: transportException(error), responseBytes: offset });
      await close(); throw error;
    }
    if (!response.body) {
      await event("response_completed", { responseBytes: 0, responseSha256: hash.digest("hex") }); await close(); return response;
    }
    const reader = response.body.getReader();
    const release = () => { try { reader.releaseLock(); } catch { /* An in-flight cancellation may still own it. */ } };
    const stream = new ReadableStream<Uint8Array>({
      async pull(controller) {
        if (settled) return;
        try {
          const result = await reader.read();
          if (settled) return;
          if (result.done) {
            settled = true;
            await event("response_completed", { responseBytes: offset, responseSha256: hash.digest("hex") });
            release(); await close(); controller.close(); return;
          }
          const chunk = result.value;
          // Fsync the exact provider bytes and their boundary before exposing them to a parser.
          writing = (async () => {
            await bytes.writeFile(chunk); await bytes.sync(); hash.update(chunk);
            await event("response_chunk", { offset, bytes: chunk.byteLength, sha256: digest(chunk) });
            offset += chunk.byteLength;
          })();
          await writing;
          if (settled) return;
          controller.enqueue(chunk);
        } catch (error) {
          if (settled) return;
          settled = true;
          await event("response_interrupted", { responseBytes: offset, responsePrefixSha256: hash.digest("hex"), exception: transportException(error) });
          release(); await close(); controller.error(error);
        }
      },
      async cancel() {
        if (settled) return;
        settled = true;
        await reader.cancel().catch(() => {});
        await writing?.catch(() => {});
        await event("consumer_stopped", { responseBytes: offset, responsePrefixSha256: hash.digest("hex"), completeBody: false });
        release(); await close();
      },
    });
    return new Response(stream, { status: response.status, statusText: response.statusText, headers: response.headers });
  };
}
