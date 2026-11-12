/** Trusted bootstrap. Imported module bytes are loaded only in this unprivileged isolated process. */
import { pathToFileURL } from "node:url";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import type { BrambleContext } from "../../../apps/fixtures/bramble/contract";
import type { SqlConnection, SqlDatabase } from "@fracture/paypal-core";
import { SOURCE_LIMITS } from "../src/limits";
const pending = new Map<string, { resolve: (value: unknown) => void; reject: (reason: Error) => void }>();
const send = (value: unknown) => { if (!process.send || !process.connected) throw new Error("SOURCE_EXECUTION_SUPERVISOR_LOST"); process.send(value); };
const rpc = (method: string, args: unknown[]) => new Promise<unknown>((resolve, reject) => { const id = randomUUID(); pending.set(id, { resolve, reject }); send({ kind: "rpc", id, method, args }); });
const connection = (tx: string | null): SqlConnection => Object.freeze({ dialect: "sqlite" as const, query: async <T extends Record<string, unknown>>(sql: string, params: unknown[] = []) => await rpc("db.query", [sql, params, tx]) as { rows: T[]; rowCount: number } });
const database: SqlDatabase = Object.freeze({ ...connection(null), transaction: async <T>(work: (tx: SqlConnection) => Promise<T>) => { const id = await rpc("db.begin", []) as string; try { const value = await work(connection(id)); await rpc("db.commit", [id]); return value; } catch (error) { await rpc("db.rollback", [id]).catch(() => {}); throw error; } }, close: async () => { throw new Error("SOURCE_EXECUTION_DATABASE_CLOSE_DENIED"); } });
const store = Object.freeze({ db: database, targetState: (...args: unknown[]) => rpc("store.targetState", args), setTargetState: (...args: unknown[]) => rpc("store.setTargetState", args), resources: (...args: unknown[]) => rpc("store.resources", args), record: (...args: unknown[]) => rpc("store.record", args), run: (...args: unknown[]) => rpc("store.run", args), emit: (...args: unknown[]) => rpc("store.emit", args) });
const transport = Object.freeze({ approve: (id: string) => rpc("transport.approve", [id]), fetch: async (input: RequestInfo | URL, init?: RequestInit) => { const request = input instanceof Request ? input : new Request(input, init); if (request.signal.aborted) throw request.signal.reason; const body = request.method === "GET" || request.method === "HEAD" ? null : await request.text(); const result = await rpc("transport.fetch", [request.url, request.method, [...request.headers.entries()], body]) as { body: string; status: number; headers: [string, string][] }; return new Response(result.body, { status: result.status, headers: result.headers }); } });
globalThis.fetch = async () => { throw new Error("SOURCE_EXECUTION_GLOBAL_NETWORK_UNAVAILABLE"); };
let checkout: ((context: BrambleContext) => Promise<unknown>) | null = null;
let initialized = false;
process.on("message", (message: unknown) => {
  if (!message || typeof message !== "object") return;
  const value = message as Record<string, unknown>;
  if (value.kind === "rpc_result" && typeof value.id === "string") {
    const item = pending.get(value.id); if (!item) return; pending.delete(value.id);
    if (value.ok === true) item.resolve(value.value); else { const error = value.errorName === "TypeError" ? new TypeError(typeof value.error === "string" ? value.error : "Sample capability refused.") : new Error(typeof value.error === "string" ? value.error : "Sample capability refused."); error.name = typeof value.errorName === "string" ? value.errorName : "Error"; if (typeof value.errorCode === "string") (error as Error & {code:string}).code = value.errorCode; item.reject(error); } return;
  }
  if (value.kind === "initialize" && !initialized && typeof value.entry === "string") {
    initialized = true;
    void (async () => {
      const status = readFileSync("/proc/self/status", "utf8"), uid = process.getuid!(), gid = process.getgid!();
      const capEff = status.match(/^CapEff:\s*([0-9a-f]+)$/mi)?.[1], capPrm = status.match(/^CapPrm:\s*([0-9a-f]+)$/mi)?.[1], noNewPrivs = status.match(/^NoNewPrivs:\s*(\d+)$/m)?.[1];
      if (uid !== 1000 || gid !== 1000 || capEff !== "0000000000000000" || capPrm !== "0000000000000000" || noNewPrivs !== "1") throw new Error("SOURCE_EXECUTION_CANDIDATE_BOUNDARY");
      const module = await import(pathToFileURL(value.entry as string).href) as { checkout?: unknown };
      if (typeof module.checkout !== "function") throw new Error("SOURCE_EXECUTION_CHECKOUT_EXPORT_MISSING");
      checkout = module.checkout as (context: BrambleContext) => Promise<unknown>;
      send({ kind: "ready", uid, gid, capEff, capPrm, noNewPrivs: true });
    })().catch(error => send({ kind: "bootstrap_failed", message: error instanceof Error ? error.message.slice(0, 500) : "Imported module failed." })); return;
  }
  if (value.kind === "invoke" && typeof value.id === "string" && checkout && value.run && typeof value.sessionId === "string") {
    const id = value.id;
    void (async () => { try { const context = Object.freeze({ run: Object.freeze(structuredClone(value.run)), sessionId: value.sessionId as string, store, transport }) as unknown as BrambleContext; await checkout!(context); send({ kind: "invoked", id, thrown: false }); } catch (error) { send({ kind: "invoked", id, thrown: true, error: error instanceof Error ? error.message.slice(0, 500) : "Imported target threw." }); } })();
  }
});
process.on("disconnect", () => process.exit(0));
setTimeout(() => process.exit(124), SOURCE_LIMITS.caseDeadlineMs).unref();
