import assert from "node:assert/strict";
import { createServer } from "node:http";
import { Readable } from "node:stream";
import { mkdtemp, realpath, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type { TestContext } from "node:test";
import { randomUUID } from "node:crypto";
import { SqliteDatabase } from "@fracture/paypal-core";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { LabService, LabStore } from "../packages/service/src/index";
import { initializeDatabase } from "../packages/service/src/database";
import { DeveloperAccess } from "../packages/developer-tools/src/access";
import { developerBearer, type DeveloperCredential } from "../packages/developer-tools/src/remote/credential";
import { handleRemoteMcp, type RemoteMcpOptions } from "../packages/developer-tools/src/remote-mcp";

export const root = new URL("../", import.meta.url).pathname.replace(/\/$/, "");
export const sampleArgs = () => ({ scenarioId: "S0", revision: "hardened", seed: "remote-fixed-seed", requestId: randomUUID() });
export function textResult<T = Record<string, unknown>>(result: Record<string, unknown>): T {
  assert.notEqual(result.isError, true, JSON.stringify(result));
  return JSON.parse((result.content as { type: string; text: string }[])[0]!.text) as T;
}
export function assertNoSecrets(value: string, secrets: string[]) {
  // Never let a failed assertion print the tested secret.
  for (const secret of secrets) assert.equal(value.includes(secret), false, "A private sentinel appeared in protocol output or diagnostics.");
}

export async function fixture(t: TestContext, extra: Partial<RemoteMcpOptions> = {}, handler: typeof handleRemoteMcp = handleRemoteMcp) {
  const directory = await realpath(await mkdtemp(join(tmpdir(), "fracture-remote-mcp-")));
  const db = new SqliteDatabase(":memory:");
  await initializeDatabase(db);
  const service = new LabService(new LabStore(db));
  const access = new DeveloperAccess(service);
  await access.initialize();
  const owner = await access.create();
  const options: RemoteMcpOptions = { origin: "http://127.0.0.1", allowLoopback: true, getService: async () => service, ...extra };
  let dropNext = false;
  let failedResponse: string | undefined;
  const seen: { method: string; headers: Headers; message: unknown }[] = [];
  const server = createServer(async (req, res) => {
    const abort = new AbortController();
    req.once("aborted", () => abort.abort());
    res.once("close", () => { if (!res.writableFinished) abort.abort(); });
    try {
      const headers = new Headers();
      for (const [name, value] of Object.entries(req.headers)) if (value !== undefined) headers.set(name, Array.isArray(value) ? value.join(", ") : value);
      const hasBody = ["POST", "PUT", "PATCH"].includes(req.method!) || headers.has("transfer-encoding") || Number(headers.get("content-length")) > 0;
      const request = new Request(new URL(req.url!, options.origin).href, { method: req.method!, headers, signal: abort.signal, ...(hasBody ? { body: Readable.toWeb(req) as ReadableStream<Uint8Array>, duplex: "half" } : {}) } as RequestInit);
      let message: unknown;
      if (req.method === "POST") { try { message = await request.clone().json(); } catch { /* Protocol validation belongs to the endpoint. */ } }
      seen.push({ method: req.method!, headers, message });
      const response = await handler(request, options);
      if (failedResponse !== undefined && req.method === "POST" && (message as { method?: string } | undefined)?.method === "tools/call") { const body = failedResponse; failedResponse = undefined; res.writeHead(502, { "content-type": "text/plain" }); res.end(body); return; }
      if (dropNext && req.method === "POST" && (message as { method?: string } | undefined)?.method === "tools/call") { dropNext = false; res.destroy(); return; }
      const bytes = await response.arrayBuffer();
      res.writeHead(response.status, Object.fromEntries(response.headers));
      res.end(Buffer.from(bytes));
    } catch { if (!res.destroyed) { res.writeHead(500); res.end(); } }
  });
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const origin = `http://127.0.0.1:${address.port}`;
  options.origin = origin;
  const endpoint = new URL("/api/mcp", origin);
  const clients: Client[] = [];
  const connect = async (credential: DeveloperCredential = owner.credential) => {
    const client = new Client({ name: "fracture-remote-sdk-test", version: "1.0.0" });
    client.onerror = () => {};
    clients.push(client);
    const transport = new StreamableHTTPClientTransport(endpoint, {
      requestInit: { headers: { authorization: `Bearer ${developerBearer(credential)}` }, redirect: "error" },
      reconnectionOptions: { maxRetries: 0, initialReconnectionDelay: 10, maxReconnectionDelay: 10, reconnectionDelayGrowFactor: 1 },
    });
    await client.connect(transport);
    return { client, transport };
  };
  const request = async (message: unknown, init: RequestInit = {}, credential = owner.credential) => handleRemoteMcp(new Request(endpoint, {
    method: "POST", body: JSON.stringify(message), ...init, headers: { accept: "application/json, text/event-stream", "content-type": "application/json", authorization: `Bearer ${developerBearer(credential)}`, "mcp-protocol-version": "2025-11-25", ...Object.fromEntries(new Headers(init.headers)) },
  }), options);
  t.after(async () => {
    await Promise.allSettled(clients.map(client => client.close()));
    server.closeAllConnections();
    await new Promise<void>(resolve => server.close(() => resolve()));
    await db.close();
    await rm(directory, { recursive: true, force: true });
  });
  return { db, directory, service, access, owner, options, server, origin, endpoint, connect, request, seen, dropResponse: () => { dropNext = true; }, failResponse: (body: string) => { failedResponse = body; } };
}
