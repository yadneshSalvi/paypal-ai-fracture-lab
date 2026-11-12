import { randomUUID } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { LabError } from "../../service/src/errors";
import type { LabService } from "../../service/src/index";
import { DeveloperAccess } from "./access";
import { DeveloperRuntime, safeDeveloperError, toolDefinitions } from "./runtime";
import { credentialFromAuthorization, type DeveloperCredential } from "./remote/credential";
import { boundedBytes, checkDeclaredLength, remoteOrigin, REMOTE_MCP_MAX_REQUEST_BYTES, REMOTE_MCP_PATH } from "./remote/policy";

export const hostedFilesystemTools = new Set(["list_source_roots", "import_source_workspace", "check_source_changes"]);
export type RemoteMcpDispatch = { status: "accepted" | "pending" | "not_required" | "worker_required"; operationId: string };
export interface RemoteMcpOptions {
  origin: string | undefined;
  allowLoopback?: boolean;
  getService: () => Promise<LabService>;
  dispatchRepair?: (jobId: string) => Promise<unknown>;
  dispatchCampaign?: (campaignId: string) => Promise<unknown>;
}

const remoteDescriptions: Record<string, string> = {
  propose_repair: "Queue a model-authored repair or refinement for an owned faulty Sample witness. The configured durable repair worker continues the original request; inspect get_run for the saved candidate and job status. No application is changed or deployed.",
  verify_patch: "Queue the exact saved candidate for isolated compilation and nine public product regressions. Hosted execution uses the configured Vercel Sandbox; a local deployment requires its qualified Docker worker. Inspect get_run and the execution receipt for the actual boundary and result. No application is changed or deployed.",
};

async function dispatchAccepted(runtime: DeveloperRuntime, name: string, args: Record<string, unknown>, result: unknown, options: RemoteMcpOptions): Promise<RemoteMcpDispatch | undefined> {
  const session = await runtime.access.authorize(runtime.credential);
  if (["propose_repair", "verify_patch"].includes(name)) {
    const operationId = `repair:${session.id}:${String(args.requestId)}`;
    const job = (await runtime.service.store.db.query<{ stage: string } & Record<string, unknown>>("SELECT stage FROM lab_repair_jobs WHERE id=$1 AND session_id=$2 AND run_id=$3 AND action_id=$4", [operationId, session.id, args.runId, args.requestId])).rows[0];
    if (!job || !["queued", "running"].includes(job.stage)) return { status: "not_required", operationId };
    if (!options.dispatchRepair) return { status: "worker_required", operationId };
    try { return { status: await options.dispatchRepair(operationId) ? "accepted" : "pending", operationId }; }
    catch { return { status: "pending", operationId }; }
  }
  if (["create_campaign", "continue_campaign", "minimize_failure"].includes(name)) {
    const campaign = (result as { campaign: { id: string; status: string } }).campaign;
    if (!["queued", "running", "waiting"].includes(campaign.status)) return { status: "not_required", operationId: campaign.id };
    if (!options.dispatchCampaign) return { status: "worker_required", operationId: campaign.id };
    try { return { status: await options.dispatchCampaign(campaign.id) ? "accepted" : "pending", operationId: campaign.id }; }
    catch { return { status: "pending", operationId: campaign.id }; }
  }
  return undefined;
}

function remoteServer(service: LabService, credential: DeveloperCredential, options: RemoteMcpOptions) {
  const runtime = new DeveloperRuntime(service, credential);
  const server = new McpServer({ name: "fracture-lab-remote", version: "0.1.0" }, {
    maxToolInputElements: 256,
    instructions: "Authenticated private developer access. Curated Sample runs are not PayPal transactions. Imported code is never executed. Remote filesystem discovery/import/change checks are unavailable; saved source reads and exact browser-view approvals retain their original authority. Reuse an existing requestId only with identical arguments after reviewing retained state. A disconnected or failed acknowledgement does not authorize a replacement model, payment, or create command. Read get_run/get_campaign to recover. Generated repairs and campaigns continue through the original durable queue and stable Workflow hook when configured.",
  });
  for (const [name, definition] of Object.entries(toolDefinitions)) {
    if (hostedFilesystemTools.has(name)) continue;
    server.registerTool(name, { description: remoteDescriptions[name] ?? definition.description, inputSchema: definition.schema, annotations: { readOnlyHint: definition.readOnly, destructiveHint: false, openWorldHint: ["diagnose_run", "propose_repair"].includes(name) } }, async (input: unknown) => {
      try {
        // Runtime retains strict schemas, original grant validation, quotas,
        // ownership, evidence and durable command identity. No duplicated service.
        const result = await runtime.call(name, input);
        const dispatch = await dispatchAccepted(runtime, name, input as Record<string, unknown>, result, options);
        await runtime.access.authorize(credential); // Do not publish late private reads after revocation.
        return { content: [{ type: "text" as const, text: JSON.stringify(result) }], ...(dispatch ? { _meta: { "fracture/dispatch": dispatch } } : {}) };
      } catch (error) {
        return { isError: true, content: [{ type: "text" as const, text: JSON.stringify(safeDeveloperError(error)) }] };
      }
    });
  }
  return server;
}

function failure(status: number, code: string, message: string, rpcCode = -32000) {
  return Response.json({ jsonrpc: "2.0", id: null, error: { code: rpcCode, message, data: { code } } }, { status });
}

function checkRequest(request: Request, options: RemoteMcpOptions) {
  const expected = remoteOrigin(options.origin, options.allowLoopback);
  const url = new URL(request.url);
  if (url.origin !== expected.origin || url.pathname !== REMOTE_MCP_PATH || url.search || url.hash || url.username || url.password || request.headers.has("host") && request.headers.get("host")?.toLowerCase() !== expected.host) throw new LabError("REMOTE_MCP_DESTINATION_DENIED", "Use the configured MCP endpoint origin and path.", 403);
  const origin = request.headers.get("origin");
  const site = request.headers.get("sec-fetch-site");
  if (origin !== null && origin !== expected.origin || site !== null && !["none", "same-origin"].includes(site)) throw new LabError("ORIGIN_DENIED", "Remote MCP browser actions must use the configured origin.", 403);
}

function acceptsMcp(header: string | null) {
  const media = new Set((header ?? "").split(",").flatMap(value => {
    const [type, ...parameters] = value.trim().toLowerCase().split(";").map(part => part.trim());
    const qualities = parameters.filter(parameter => parameter.startsWith("q="));
    const quality = qualities.length === 0 ? 1 : Number(qualities[0]!.slice(2));
    return qualities.length <= 1 && quality > 0 && quality <= 1 ? [type] : [];
  }));
  return media.has("application/json") && media.has("text/event-stream");
}

/** Fresh SDK server + stateless transport for EVERY HTTP request. No session map. */
export async function handleRemoteMcp(request: Request, options: RemoteMcpOptions): Promise<Response> {
  const requestId = randomUUID();
  let server: McpServer | undefined;
  let response: Response;
  try {
    checkRequest(request, options);
    const credential = credentialFromAuthorization(request.headers.get("authorization"));
    const service = await options.getService();
    const access = new DeveloperAccess(service);
    await access.authorize(credential);
    await service.store.rateLimit(`developer:${credential.id}:remote-http`, 120, 60_000);
    if (!["POST", "GET", "DELETE"].includes(request.method)) {
      response = failure(405, "REMOTE_MCP_METHOD_DENIED", "Use POST for MCP messages or DELETE to disconnect.");
      response.headers.set("allow", "POST, DELETE");
    } else if (request.headers.has("mcp-session-id") || request.headers.has("last-event-id")) {
      response = failure(400, "REMOTE_MCP_STATELESS", "This stateless endpoint issues no MCP session or stream replay identity.");
    } else if (request.method === "GET") {
      // The SDK client probes GET after initialized. Stateless JSON mode has no
      // standalone notification stream and MUST answer 405, without opening SSE.
      response = failure(405, "REMOTE_MCP_STREAM_UNAVAILABLE", "This stateless endpoint uses JSON responses to POST messages.");
      response.headers.set("allow", "POST, DELETE");
    } else {
      checkDeclaredLength(request.headers, REMOTE_MCP_MAX_REQUEST_BYTES);
      if (request.headers.has("content-encoding") && request.headers.get("content-encoding") !== "identity") throw new LabError("REMOTE_MCP_ENCODING_DENIED", "Compressed MCP request bodies are unavailable.", 415);
      let parsedBody: unknown;
      if (request.method === "POST") {
        if (!acceptsMcp(request.headers.get("accept"))) throw new LabError("REMOTE_MCP_ACCEPT_REQUIRED", "Accept both application/json and text/event-stream.", 406);
        if (!/^application\/json(?:\s*;\s*charset=utf-8)?\s*$/i.test(request.headers.get("content-type") ?? "")) throw new LabError("REMOTE_MCP_JSON_REQUIRED", "Send application/json with UTF-8 encoding.", 415);
        const bytes = await boundedBytes(request.body, REMOTE_MCP_MAX_REQUEST_BYTES);
        try { parsedBody = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)); }
        catch { throw new LabError("REMOTE_MCP_JSON_INVALID", "The MCP body is not valid UTF-8 JSON.", 400); }
        if (Array.isArray(parsedBody)) throw new LabError("REMOTE_MCP_BATCH_UNAVAILABLE", "Send one MCP message per HTTP request.", 400);
      } else if (request.body || Number(request.headers.get("content-length")) > 0) throw new LabError("REMOTE_MCP_BODY_UNEXPECTED", "Disconnect requests have no body.", 400);
      if (request.signal.aborted) throw new LabError("REMOTE_MCP_REQUEST_ABORTED", "The request ended before dispatch.", 400);
      // Body arrival can span expiry/revocation. Initialize/list/notifications
      // must pass current authority at SDK dispatch, just as tool calls do.
      await access.authorize(credential);
      server = remoteServer(service, credential, options);
      const transport = new WebStandardStreamableHTTPServerTransport({ enableJsonResponse: true, maxRequestBodySize: REMOTE_MCP_MAX_REQUEST_BYTES });
      await server.connect(transport);
      // Keep bearer/cookies out of SDK requestInfo and tool handler metadata.
      const headers = new Headers();
      for (const name of ["accept", "content-type", "mcp-protocol-version"]) {
        const value = request.headers.get(name);
        if (value !== null) headers.set(name, value);
      }
      response = await transport.handleRequest(new Request(request.url, { method: request.method, headers }), parsedBody === undefined ? {} : { parsedBody });
    }
  } catch (error) {
    const known = error instanceof LabError;
    response = failure(known ? error.status : 503, known ? error.code : "REMOTE_MCP_UNAVAILABLE", known ? error.message : "The remote acknowledgement is unavailable. Inspect retained command state before retrying.");
    if (known && error.status === 401) response.headers.set("www-authenticate", 'Bearer realm="fracture-lab"');
  } finally { await server?.close(); }
  response.headers.set("cache-control", "no-store");
  response.headers.set("pragma", "no-cache");
  response.headers.set("vary", "Authorization, Origin");
  response.headers.set("x-content-type-options", "nosniff");
  response.headers.set("x-request-id", requestId);
  return request.method === "HEAD" ? new Response(null, { status: response.status, headers: response.headers }) : response;
}
