import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { randomBytes, randomUUID } from "node:crypto";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { createPinnedRemoteFetch } from "../packages/developer-tools/src/remote/pinned-fetch";
import { developerBearer } from "../packages/developer-tools/src/remote/credential";
import { remoteOrigin, REMOTE_MCP_MAX_REQUEST_BYTES, REMOTE_MCP_MAX_RESPONSE_BYTES } from "../packages/developer-tools/src/remote/policy";

const credential = () => ({ version: 1 as const, id: randomUUID(), secret: randomBytes(32).toString("hex") });

test("one explicit HTTPS origin is required; loopback is available only through a deliberate test opt-in", () => {
  assert.equal(remoteOrigin("https://fracture.example").origin, "https://fracture.example");
  assert.equal(remoteOrigin("http://127.0.0.1:4104", true).origin, "http://127.0.0.1:4104");
  for (const value of [undefined, "http://fracture.example", "https://user:private@fracture.example", "https://fracture.example/api/mcp", "https://fracture.example?secret=value", "https://fracture.example#secret", "https://fracture.example/../", "http://127.0.0.1:4104", "https://localhost", " https://fracture.example"]) assert.throws(() => remoteOrigin(value), { code: "REMOTE_MCP_ORIGIN_INVALID" });
});

test("pinned SDK fetch strips unrelated credentials and rejects changed paths, origins, methods and oversized outbound bodies", async () => {
  const grant = credential(); const origin = remoteOrigin("https://fracture.example");
  let sent = 0;
  const pinned = createPinnedRemoteFetch(origin, grant, async (url, init) => {
    sent++;
    assert.equal(String(url), "https://fracture.example/api/mcp");
    assert.equal(init?.redirect, "manual"); assert.equal(init?.credentials, "omit");
    const headers = new Headers(init?.headers);
    assert.equal(headers.get("authorization"), `Bearer ${developerBearer(grant)}`);
    assert.deepEqual([...headers.keys()].sort(), ["accept", "authorization", "content-type", "mcp-protocol-version"]);
    assert.equal(headers.get("cookie"), null); assert.equal(headers.get("x-api-key"), null);
    return Response.json({ jsonrpc: "2.0", id: 1, result: {} });
  });
  await pinned("https://fracture.example/api/mcp", { method: "POST", body: "{}", headers: { authorization: "must-not-forward", cookie: "must-not-forward", "x-api-key": "must-not-forward", accept: "application/json", "content-type": "application/json", "mcp-protocol-version": "2025-11-25" } });
  for (const url of ["https://other.example/api/mcp", "https://fracture.example/other", "https://fracture.example/api/mcp?capability=private"]) await assert.rejects(pinned(url, { method: "POST", body: "{}" }), { code: "REMOTE_MCP_DESTINATION_DENIED" });
  await assert.rejects(pinned("https://fracture.example/api/mcp", { method: "PATCH", body: "{}" }), { code: "REMOTE_MCP_DESTINATION_DENIED" });
  await assert.rejects(pinned("https://fracture.example/api/mcp", { method: "POST", body: "x".repeat(REMOTE_MCP_MAX_REQUEST_BYTES + 1) }), { code: "REMOTE_MCP_BODY_TOO_LARGE" });
  assert.equal(sent, 1);
});

test("real SDK HTTP clients do not follow even same-origin credential-bearing redirects or redispatch POST", async t => {
  const grant = credential();
  let posts = 0; let redirectTargets = 0;
  const server = createServer((req, res) => {
    if (req.url === "/api/mcp") {
      if (req.method === "POST") posts++;
      assert.equal(req.headers.authorization, `Bearer ${developerBearer(grant)}`);
      res.writeHead(307, { location: "/never-follow?private-location-sentinel" }); res.end();
    } else { redirectTargets++; res.writeHead(500); res.end(); }
  });
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  const address = server.address(); assert.ok(address && typeof address !== "string");
  const origin = remoteOrigin(`http://127.0.0.1:${address.port}`, true);
  const client = new Client({ name: "redirect-boundary", version: "1" });
  client.onerror = () => {};
  const transport = new StreamableHTTPClientTransport(new URL("/api/mcp", origin), { fetch: createPinnedRemoteFetch(origin, grant) });
  t.after(async () => { await client.close(); server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); });
  await assert.rejects(client.connect(transport), error => {
    assert.match(String(error), /No redirect was followed/);
    assert.equal(String(error).includes("private-location-sentinel"), false);
    return true;
  });
  assert.equal(posts, 1); assert.equal(redirectTargets, 0);
  for (const status of [301, 302, 303, 307, 308]) {
    const pinned = createPinnedRemoteFetch(origin, grant, async () => new Response(null, { status, headers: { location: `https://other.example/${grant.secret}` } }));
    await assert.rejects(pinned(new URL("/api/mcp", origin), { method: "POST", body: "{}" }), { code: "REMOTE_MCP_REDIRECT_DENIED" });
  }
});

test("response lengths and chunked bodies are bounded; an expired observation is aborted without retry", async () => {
  const grant = credential(); const origin = remoteOrigin("https://fracture.example"); const endpoint = new URL("/api/mcp", origin);
  const declared = createPinnedRemoteFetch(origin, grant, async () => new Response("{}", { headers: { "content-length": String(REMOTE_MCP_MAX_RESPONSE_BYTES + 1) } }));
  await assert.rejects(declared(endpoint), { code: "REMOTE_MCP_BODY_TOO_LARGE" });
  let cancelled = false;
  const chunk = new Uint8Array(1024 * 1024);
  const chunked = createPinnedRemoteFetch(origin, grant, async () => new Response(new ReadableStream({ start(controller) { for (let i = 0; i < 65; i++) controller.enqueue(chunk); }, cancel() { cancelled = true; } })));
  await assert.rejects(chunked(endpoint), { code: "REMOTE_MCP_BODY_TOO_LARGE" });
  assert.equal(cancelled, true);
  let attempts = 0;
  const deadline = createPinnedRemoteFetch(origin, grant, async (_url, init) => {
    attempts++;
    return new Promise<Response>((_resolve, reject) => { init?.signal?.addEventListener("abort", () => reject(new Error("local observation timed out")), { once: true }); });
  }, 10);
  const timer = setTimeout(() => {}, 1000); // Keep this deterministic test alive; timeout signals are unref'ed.
  try { await assert.rejects(deadline(endpoint), /observation timed out/); }
  finally { clearTimeout(timer); }
  assert.equal(attempts, 1);
});
