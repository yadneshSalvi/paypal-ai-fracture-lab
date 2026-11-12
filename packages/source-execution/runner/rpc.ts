import type { ChildProcess, Serializable } from "node:child_process";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { SqlConnection, SqlDatabase } from "@fracture/paypal-core";
import type { BrambleContext } from "../../../apps/fixtures/bramble/contract";
import { assertTargetSql } from "../../isolation/src/capabilities";
import { SOURCE_LIMITS } from "../src/limits";
import {objectHash} from "../src/hash";
const requestSchema = z.strictObject({ kind: z.literal("rpc"), id: z.uuid(), method: z.enum(["db.query", "db.begin", "db.commit", "db.rollback", "store.targetState", "store.setTargetState", "store.resources", "store.record", "store.run", "store.emit", "transport.approve", "transport.fetch"]), args: z.array(z.unknown()).max(8) });
interface RemoteTransaction { connection: SqlConnection; finish: (commit: boolean) => void; done: Promise<unknown> }
/** Trusted, capability-limited RPC; target output is never interpreted as a final proof. */
export function sourceCapabilityRpc(child: ChildProcess, context: BrambleContext, database: SqlDatabase, protocolFailure: (code: string) => void, deadlineAt: number) {
  const seen = new Set<string>(), transactions = new Map<string, RemoteTransaction>(); let calls = 0, stopped = false; const pending = new Set<Promise<unknown>>(); const audit: {method:string;argsHash:string;rejected:boolean;error:string|null;errorName:string|null;errorCode:string|null}[] = [];
  const send = (value: unknown) => { if (child.connected) child.send(value as Serializable); };
  const execute = async (method: string, args: unknown[]): Promise<unknown> => {
    if (stopped || Date.now() >= deadlineAt) throw new Error("SOURCE_EXECUTION_DEADLINE");
    switch (method) {
      case "db.query": { const [sql, params, tx] = z.tuple([z.string().min(1).max(12000), z.array(z.unknown()).max(64), z.string().uuid().nullable()]).parse(args); assertTargetSql(sql); if (tx) { const item = transactions.get(tx); if (!item) throw new Error("SOURCE_EXECUTION_TRANSACTION_UNKNOWN"); return item.connection.query(sql, params); } return context.store.db.query(sql, params); }
      case "db.begin": { z.tuple([]).parse(args); if (transactions.size >= 16) throw new Error("SOURCE_EXECUTION_TRANSACTION_LIMIT"); const id = randomUUID(); let ready!: () => void, readyReject!: (reason: unknown) => void, finish!: (commit: boolean) => void; const started = new Promise<void>((resolve, reject) => { ready = resolve; readyReject = reject; }), complete = new Promise<boolean>(resolve => { finish = resolve; }); const done = database.transaction(async connection => { if (stopped) throw new Error("SOURCE_EXECUTION_RPC_STOPPED"); transactions.set(id, { connection, finish, done: Promise.resolve() }); ready(); if (!await complete) throw new Error("SOURCE_EXECUTION_TRANSACTION_ROLLBACK"); }); done.catch(error => { readyReject(error); }); await started; transactions.get(id)!.done = done; return id; }
      case "db.commit": case "db.rollback": { const [id] = z.tuple([z.uuid()]).parse(args), item = transactions.get(id); if (!item) throw new Error("SOURCE_EXECUTION_TRANSACTION_UNKNOWN"); item.finish(method === "db.commit"); try { await item.done; } catch (error) { if (method === "db.commit") throw error; } finally { transactions.delete(id); } return null; }
      case "store.targetState": { const [run, intent] = z.tuple([z.string(), z.string()]).parse(args); return context.store.targetState(run, intent); }
      case "store.setTargetState": { const [run, state] = z.tuple([z.string(), z.record(z.string(), z.unknown())]).parse(args); if (typeof state.intentId !== "string" || !Array.isArray(state.orderIds) || !["unpaid", "processing", "paid", "failed", "checking"].includes(String(state.status)) || !Number.isInteger(state.attempt) || !Number.isInteger(state.fulfillmentCount) || !(state.lastCaptureId === null || typeof state.lastCaptureId === "string") || typeof state.unknown !== "boolean") throw new Error("SOURCE_EXECUTION_STATE_INVALID"); return context.store.setTargetState(run, state as unknown as Parameters<BrambleContext["store"]["setTargetState"]>[1]); }
      case "store.resources": { const [run] = z.tuple([z.string()]).parse(args); return context.store.resources(run); }
      case "store.record": { const [run, session] = z.tuple([z.string(), z.string().optional()]).parse(args); return context.store.record(run, session); }
      case "store.run": { const [run, session] = z.tuple([z.string(), z.string().optional()]).parse(args); return context.store.run(run, session); }
      case "store.emit": { const [run, event] = z.tuple([z.string(), z.record(z.string(), z.unknown())]).parse(args); if (typeof event.kind !== "string" || typeof event.title !== "string" || typeof event.detail !== "string") throw new Error("SOURCE_EXECUTION_EVENT_INVALID"); return context.store.emit(run, event as unknown as Parameters<BrambleContext["store"]["emit"]>[1]); }
      case "transport.approve": { const [id] = z.tuple([z.string().min(1).max(200)]).parse(args); return context.transport.approve(id); }
      case "transport.fetch": { const [url, method, headers, body] = z.tuple([z.string().max(2000), z.enum(["GET", "POST"]), z.array(z.tuple([z.string().max(200), z.string().max(2000)])).max(30), z.string().max(128000).nullable()]).parse(args); const parsed = new URL(url); if (parsed.origin !== "https://api-m.sandbox.paypal.com" || parsed.username || parsed.password) throw new Error("SOURCE_EXECUTION_SAMPLE_HOST_DENIED"); const response = await context.transport.fetch(new Request(url, { method, headers, ...(body === null ? {} : { body }) })); return { body: await response.text(), status: response.status, headers: [...response.headers.entries()] }; }
      default: throw new Error("SOURCE_EXECUTION_RPC_UNSUPPORTED");
    }
  };
  const onMessage = (message: unknown) => {
    if (!message || typeof message !== "object" || (message as { kind?: unknown }).kind !== "rpc") return;
    if (Buffer.byteLength(JSON.stringify(message)) > SOURCE_LIMITS.rpcBytes) { protocolFailure("SOURCE_EXECUTION_RPC_OUTPUT_LIMIT"); return; }
    const parsed = requestSchema.safeParse(message);
    if (!parsed.success || seen.has(parsed.data.id) || ++calls > SOURCE_LIMITS.rpcCalls) { protocolFailure("SOURCE_EXECUTION_RPC_PROTOCOL"); return; }
    const input = parsed.data; seen.add(input.id);
    const work = execute(input.method, input.args).then(value => { audit.push({method:input.method,argsHash:objectHash(input.args),rejected:false,error:null,errorName:null,errorCode:null}); send({ kind: "rpc_result", id: input.id, ok: true, value: value ?? null }); }, error => { const message = error instanceof Error ? error.message.slice(0,500) : "Sample capability refused."; const errorName=error instanceof Error?error.name:"Error",errorCode=error&&typeof error==="object"&&typeof (error as NodeJS.ErrnoException).code==="string"?(error as NodeJS.ErrnoException).code!:null; audit.push({method:input.method,argsHash:objectHash(input.args),rejected:true,error:message,errorName,errorCode}); send({ kind: "rpc_result", id: input.id, ok: false, error: message, errorName,errorCode }); }); pending.add(work); work.finally(() => pending.delete(work)).catch(() => {});
  };
  child.on("message", onMessage);
  return { calls: () => calls, audit: () => structuredClone(audit), close: async () => { stopped = true; child.off("message", onMessage); for (const item of transactions.values()) item.finish(false); await Promise.allSettled([...transactions.values()].map(item => item.done)); await Promise.allSettled([...pending]); transactions.clear(); } };
}
