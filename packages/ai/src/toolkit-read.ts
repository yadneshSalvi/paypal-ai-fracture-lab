import { randomUUID } from "node:crypto";
import { Worker } from "node:worker_threads";
import { canonicalJson, sha256 } from "@fracture/paypal-core";
import type { EvidenceDTO } from "@fracture/contracts";
import { LabStore } from "../../service/src/store";
import { LabError } from "../../service/src/errors";
import { artifactPath } from "../../service/src/config";
import { LocalPayPalTransport } from "../../runner/src/local-provider";
import { campaignFaultsForRun } from "../../campaigns/src/followups";
import { modelAttemptIdentity } from "./model";

export interface OwnedToolkitRead {
  tool: { type: "function"; name: "get_order"; description: string; parameters: Record<string, unknown> };
  orderId: string;
  wireOrderId: string;
  schemaHash: string;
  execute(name: string, args: unknown, callId: string, actionId?: string): Promise<EvidenceDTO>;
}

/** A single owned Sample read through the actual pinned Toolkit, with no payment capability. */
export async function ownedToolkitRead(store: LabStore, sessionId: string, runId: string, orderId: string): Promise<OwnedToolkitRead> {
  const run = await store.run(runId, sessionId);
  if (run.source !== "sample" || !run.orderIds.includes(orderId)) throw new LabError("TOOLKIT_RESOURCE_DENIED", "Only an existing order owned by this Sample run can be read.", 403);
  const resource = (await store.resources(runId)).find(item => item.id === orderId && item.kind === "order");
  if (!resource) throw new LabError("TOOLKIT_RESOURCE_MISSING", "The original Sample order is unavailable; no substitute is created.", 409);
  const { PayPalAgentToolkit } = await import("@paypal/agent-toolkit/openai");
  const toolkit = new PayPalAgentToolkit({ clientId: "sample-only-id", clientSecret: "sample-only-secret", configuration: { actions: { orders: { get: true } }, context: { sandbox: true } } });
  const tools = toolkit.getTools();
  const selected = tools[0];
  if (tools.length !== 1 || !selected || selected.type !== "function" || selected.function.name !== "get_order") throw new LabError("TOOLKIT_TOOLSET_CHANGED", "The pinned Toolkit did not expose exactly its order read.", 503);
  const parameters = JSON.parse(JSON.stringify(selected.function.parameters)) as Record<string, unknown>;
  const schemaHash = sha256(canonicalJson(parameters));
  // The installed schema requires 17–32 uppercase alphanumerics. Existing Sample
  // IDs deliberately contain SAMPLE-; this explicit read alias changes no resource.
  const wireOrderId = sha256(canonicalJson({ runId, orderId, purpose: "sample-toolkit-read-alias-v1" })).slice(0, 24).toUpperCase();
  const tool: OwnedToolkitRead["tool"] = { type: "function", name: "get_order", description: `${selected.function.description ?? "Read an order."} Controlled Sample adapter only: use the one declared wireOrderId. It maps to an existing Sample order and is not a live PayPal ID.`, parameters };
  return {
    tool, orderId, wireOrderId, schemaHash,
    async execute(name, args, callId, actionId) {
      if (name !== "get_order" || canonicalJson(args) !== canonicalJson({ id: wireOrderId }) || typeof callId !== "string" || !callId || callId.length > 600) throw new LabError("TOOLKIT_ARGUMENTS_DENIED", "Only the declared original order read is authorized.", 403);
      const current = await store.run(runId, sessionId);
      if (current.source !== "sample" || !current.orderIds.includes(orderId) || (await store.record(runId, sessionId)).cancelled) throw new LabError("TOOLKIT_AUTHORITY_ENDED", "The original Sample read is no longer authorized.", 409);
      const receiptId = actionId ? modelAttemptIdentity(sessionId, actionId, "toolkit_order_read") : randomUUID();
      const validateReceipt = (receipt: EvidenceDTO) => {
        if (receipt.runId !== runId || receipt.source !== "sample" || receipt.sha256 !== sha256(canonicalJson(receipt.body)) || receipt.body.modelToolCallId !== callId || receipt.body.orderId !== orderId || receipt.body.schemaHash !== schemaHash || receipt.body.wireOrderId !== wireOrderId) throw new LabError("TOOLKIT_RECEIPT_CONFLICT", "The original tool receipt does not match this scoped read.", 409);
        return receipt;
      };
      if (actionId) {
        const action = (await store.db.query<{ stage: string; run_id: string } & Record<string, unknown>>("SELECT stage,run_id FROM lab_actions WHERE id=$1 AND session_id=$2", [actionId, sessionId])).rows[0];
        if (action?.stage !== "running" || action.run_id !== runId) throw new LabError("WORK_CANCELLED", "This investigation no longer authorizes a tool read.", 409);
        const saved = (await store.db.query<{ session_id: string; run_id: string; document: string } & Record<string, unknown>>("SELECT session_id,run_id,document FROM lab_evidence WHERE id=$1", [receiptId])).rows[0];
        if (saved) {
          if (saved.session_id !== sessionId || saved.run_id !== runId) throw new LabError("TOOLKIT_RECEIPT_CONFLICT", "The receipt belongs to another scope.", 409);
          return validateReceipt(JSON.parse(saved.document) as EvidenceDTO);
        }
      }
      const transport = new LocalPayPalTransport(store, runId, await campaignFaultsForRun(store, current, sessionId));
      const before = sha256(canonicalJson(await store.resources(runId)));
      const worker = new Worker(artifactPath("packages/ai/src/toolkit-read-worker.mjs"), { env: { NODE_ENV: "production" }, execArgv: [], workerData: { wireOrderId, callId }, stdout: true, stderr: true });
      worker.stdout.resume(); worker.stderr.resume();
      const requests: { method: string; path: string; status: number }[] = [];
      let readDispatched = false;
      let workerBoundary: { node: string; environmentKeys: string[]; execArgvCount: number; workerDataKeys: string[] } | null = null;
      try {
        const observed = await new Promise<Record<string, unknown>>((resolve, reject) => {
          let done = false;
          const finish = (error: unknown, value?: Record<string, unknown>) => { if (done) return; done = true; clearTimeout(timer); error ? reject(error) : resolve(value!); };
          const timer = setTimeout(() => finish(new LabError("TOOLKIT_READ_TIMEOUT", "The Sample tool did not return an answer. No write or replacement was attempted.", 504)), 20_000);
          worker.once("error", () => finish(new LabError("TOOLKIT_WORKER_FAILED", "The trusted tool worker stopped before returning an answer.", 502)));
          worker.once("exit", () => { if (!done) finish(new LabError("TOOLKIT_WORKER_EXIT", "The trusted tool worker exited without a retained result.", 502)); });
          worker.on("message", async (message: Record<string, unknown>) => {
            if (done) return;
            if (message.type === "request") {
              try {
                const token = message.method === "POST" && message.path === "/v1/oauth2/token";
                const read = message.method === "GET" && message.path === `/v2/checkout/orders/${wireOrderId}`;
                if ((!token && !read) || (read && readDispatched)) throw new Error("TOOLKIT_ENDPOINT_DENIED");
                if (read) readDispatched = true;
                const path = token ? "/v1/oauth2/token" : `/v2/checkout/orders/${orderId}`;
                const reply = await transport.fetch(`https://api-m.sandbox.paypal.com${path}`, { method: token ? "POST" : "GET" });
                const body = await reply.json() as Record<string, unknown>;
                requests.push({ method: token ? "POST" : "GET", path, status: reply.status });
                // Only benign Sample data crosses the heap boundary; no API headers do.
                if (!done) worker.postMessage({ id: message.id, status: reply.status, headers: { "content-type": "application/json" }, body });
              } catch { if (!done) worker.postMessage({ id: message.id, error: true }); }
            } else if (message.type === "result") {
              const body = message.body;
              if (!readDispatched || !body || typeof body !== "object" || Array.isArray(body) || (body as Record<string, unknown>).id !== orderId) return finish(new LabError("TOOLKIT_RESULT_INVALID", "The Toolkit did not return the original Sample order.", 502));
              const boundary = message.boundary as typeof workerBoundary;
              if (!boundary || boundary.node !== process.version || boundary.execArgvCount !== 0 || canonicalJson(boundary.environmentKeys) !== canonicalJson(["NODE_ENV"]) || canonicalJson(boundary.workerDataKeys) !== canonicalJson(["callId", "wireOrderId"])) return finish(new LabError("TOOLKIT_WORKER_BOUNDARY", "The trusted Toolkit worker did not retain its declared environment boundary.", 502));
              workerBoundary = boundary;
              finish(null, body as Record<string, unknown>);
            } else if (message.type === "failure") finish(new LabError("TOOLKIT_READ_FAILED", "The original order read failed; its outcome remains unresolved.", 502));
          });
        });
        const after = sha256(canonicalJson(await store.resources(runId)));
        if (before !== after) throw new LabError("TOOLKIT_RESOURCE_CHANGED", "Resource state changed during the read; the boundary is not qualified.", 409);
        const body = { tool: "get_order", package: "@paypal/agent-toolkit", version: "1.11.0", source: "sample", boundary: "run-owned controlled Sample transport", readOnly: true, modelToolCallId: callId, orderId, wireOrderId, aliasPurpose: "Satisfies the installed Toolkit input format; maps only to this existing Sample order. Not a live provider identity.", schemaHash, requests, workerBoundary, resourcesUnchanged: true, resourceHash: before, observed };
        const receipt: EvidenceDTO = { id: receiptId, runId, title: "Model-selected Toolkit order read", kind: "receipt", source: "sample", createdAt: new Date().toISOString(), sha256: sha256(canonicalJson(body)), summary: "The actual pinned Toolkit read the original Sample order through a restricted local adapter. No financial request left the application.", body, redactions: ["Only benign Sample credentials enter the separate Toolkit worker heap.", "This trusted library worker is not an arbitrary-code isolation sandbox."] };
        if (!actionId) { await store.addEvidence(sessionId, receipt); return receipt; }
        return await store.db.transaction(async tx => {
          const action = (await tx.query<{ stage: string; run_id: string } & Record<string, unknown>>("SELECT stage,run_id FROM lab_actions WHERE id=$1 AND session_id=$2 FOR UPDATE", [actionId, sessionId])).rows[0];
          if (action?.stage !== "running" || action.run_id !== runId) throw new LabError("WORK_CANCELLED", "The investigation ended before its read receipt could be published.", 409);
          await tx.query("INSERT INTO lab_evidence(id,session_id,run_id,created_at,document) VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING", [receipt.id, sessionId, runId, receipt.createdAt, JSON.stringify(receipt)]);
          const saved = (await tx.query<{ document: string } & Record<string, unknown>>("SELECT document FROM lab_evidence WHERE id=$1 AND session_id=$2 AND run_id=$3", [receiptId, sessionId, runId])).rows[0];
          if (!saved) throw new LabError("TOOLKIT_RECEIPT_CONFLICT", "The original read receipt could not be retained.", 409);
          return validateReceipt(JSON.parse(saved.document) as EvidenceDTO);
        });
      } finally { await worker.terminate(); }
    },
  };
}
