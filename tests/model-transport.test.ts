import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import http, { type IncomingMessage, type ServerResponse } from "node:http";
import { once } from "node:events";
import { test, type TestContext } from "node:test";
import { getGlobalDispatcher } from "undici";
import {
  createModelTransport, modelTransportReceipt, ModelTransportError, transportException,
  type ModelTransportLimits,
} from "../packages/ai/src/transport";

const endpoint = "https://api.openai.com/v1/responses";
const request = { method: "POST", body: '{"fixture":true}', headers: { authorization: "Bearer OFFLINE_PRIVATE_SENTINEL" } };

async function fixture(t: TestContext, handler: (request: IncomingMessage, response: ServerResponse) => void, limits: Partial<ModelTransportLimits> = {}) {
  let dispatched = 0;
  const server = http.createServer((req, res) => { dispatched++; handler(req, res); });
  server.listen(0, "127.0.0.1"); await once(server, "listening");
  const address = server.address(); assert(address && typeof address === "object");
  const origin = `http://127.0.0.1:${address.port}`;
  t.after(async () => { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); });
  // Only the test replaces the approved upstream with its own loopback server.
  const localFetch: typeof fetch = (input, init) => {
    const url = new URL(typeof input === "string" ? input : input instanceof URL ? input : input.url);
    return fetch(origin + url.pathname + url.search, init);
  };
  return { send: createModelTransport({ fetchImpl: localFetch, limits }), dispatches: () => dispatched };
}

test("records exact body bytes and runtime identities without credential-bearing headers", async t => {
  const text = '{"text":"payment \u2713","status":"completed"}';
  const f = await fixture(t, (_, res) => { res.writeHead(200, { "content-type": "application/json", "x-request-id": "req_fixture_01" }); res.end(text); });
  const dispatcher = getGlobalDispatcher();
  const response = await f.send(endpoint, request);
  assert.equal(await response.text(), text);
  const receipt = modelTransportReceipt(response)!;
  assert.equal(receipt.phase, "completed");
  assert.equal(receipt.responseBytes, Buffer.byteLength(text));
  assert.equal(receipt.responseSha256, createHash("sha256").update(text).digest("hex"));
  assert.equal(receipt.dispatcherUndici, "7.30.2");
  assert.equal(receipt.requestId, "req_fixture_01");
  assert(!JSON.stringify(receipt).includes("OFFLINE_PRIVATE_SENTINEL"));
  assert.equal(receipt.automaticRetries, 0);
  assert.equal(getGlobalDispatcher(), dispatcher);
  receipt.phase = "failed";
  assert.equal(modelTransportReceipt(response)!.phase, "completed");
});

test("retains HTTP 520 and its non-JSON body hash without claiming a parsing failure", async t => {
  const f = await fixture(t, (_, res) => { res.writeHead(520, { "content-type": "text/html" }); res.end("<html>upstream unavailable</html>"); });
  const response = await f.send(endpoint, request);
  assert.equal(response.status, 520);
  await response.text();
  const receipt = modelTransportReceipt(response)!;
  assert.equal(receipt.httpStatus, 520);
  assert.equal(receipt.contentType, "text/html");
  assert.equal(receipt.exception, null);
  assert(receipt.responseSha256);
  assert.equal(f.dispatches(), 1);
});

test("captures a real headers timeout cause with no redispatch", { timeout: 5000 }, async t => {
  const f = await fixture(t, () => {}, { headersTimeoutMs: 40 });
  await assert.rejects(f.send(endpoint, { ...request, signal: AbortSignal.timeout(4000) }), error => {
    assert(error instanceof ModelTransportError);
    assert.equal(error.transport.httpStatus, null);
    assert.equal(error.transport.phase, "failed");
    assert(JSON.stringify(error.transport.exception).includes("UND_ERR_HEADERS_TIMEOUT"));
    return true;
  });
  assert.equal(f.dispatches(), 1);
});

test("captures a real silent-body timeout separately from received HTTP headers", { timeout: 5000 }, async t => {
  const f = await fixture(t, (_, res) => { res.writeHead(200); res.flushHeaders(); res.write('{"ok":'); }, { bodyTimeoutMs: 40 });
  const response = await f.send(endpoint, { ...request, signal: AbortSignal.timeout(4000) });
  await assert.rejects(response.text(), error => {
    assert(error instanceof ModelTransportError);
    assert.equal(error.transport.httpStatus, 200);
    assert(JSON.stringify(error.transport.exception).includes("UND_ERR_BODY_TIMEOUT"));
    return true;
  });
  assert.equal(modelTransportReceipt(response)!.phase, "failed");
  assert.equal(f.dispatches(), 1);
});

test("explicit limits permit delayed headers and delayed body under the caller's total deadline", async t => {
  const timers: ReturnType<typeof setTimeout>[] = [];
  t.after(() => timers.forEach(clearTimeout));
  const f = await fixture(t, (_, res) => {
    timers.push(setTimeout(() => {
      res.writeHead(200); res.write('{"ok":');
      timers.push(setTimeout(() => res.end("true}"), 120));
    }, 120));
  }, { headersTimeoutMs: 2000, bodyTimeoutMs: 2000 });
  const response = await f.send(endpoint, { ...request, signal: AbortSignal.timeout(3000) });
  assert.deepEqual(await response.json(), { ok: true });
  assert(modelTransportReceipt(response)!.durationMs >= 200);
});

test("caller abort remains effective while reading and does not leak an arbitrary reason", async t => {
  const f = await fixture(t, (_, res) => { res.writeHead(200); res.write("partial"); });
  const abort = new AbortController();
  const response = await f.send(endpoint, { ...request, signal: abort.signal });
  const result = response.text();
  abort.abort(new Error("NEVER_PUBLISH_THIS_REASON"));
  await assert.rejects(result, ModelTransportError);
  const receipt = modelTransportReceipt(response)!;
  assert.equal(receipt.phase, "failed");
  assert(!JSON.stringify(receipt).includes("NEVER_PUBLISH_THIS_REASON"));
  assert.equal(f.dispatches(), 1);
});

test("a response larger than the byte allowance is stopped without accepting its prefix", async t => {
  const f = await fixture(t, (_, res) => res.end("\u2713\u2713\u2713"), { maximumResponseBytes: 8 });
  const response = await f.send(endpoint, request);
  await assert.rejects(response.text(), error => error instanceof ModelTransportError && error.code === "MODEL_RESPONSE_LIMIT");
  const receipt = modelTransportReceipt(response)!;
  assert.equal(receipt.responseSha256, null);
  assert.equal(receipt.responseBytes, 9);
  assert.equal(receipt.phase, "failed");
});

test("stopping after a terminal stream event closes the owned connection and marks a prefix", async t => {
  const f = await fixture(t, (_, res) => {
    res.writeHead(200, { "content-type": "text/event-stream" });
    res.write('data: {"type":"response.completed"}\n\n');
  });
  const response = await f.send(endpoint, request);
  const reader = response.body!.getReader();
  assert((await reader.read()).value);
  await reader.cancel(); reader.releaseLock();
  const receipt = modelTransportReceipt(response)!;
  assert.equal(receipt.phase, "consumer_cancelled");
  assert.equal(receipt.responseSha256, null);
});

test("a redirect is never followed to a second host or path", async t => {
  const f = await fixture(t, (_, res) => { res.writeHead(302, { location: "https://unexpected.invalid/private" }); res.end(); });
  await assert.rejects(f.send(endpoint, request), ModelTransportError);
  assert.equal(f.dispatches(), 1);
});

test("fixed endpoint authority rejects userinfo, protocol changes, new paths and mutation query strings before dispatch", async () => {
  let calls = 0;
  const send = createModelTransport({ fetchImpl: async () => { calls++; return new Response(); } });
  for (const url of [
    "https://api.openai.com@unexpected.invalid/v1/responses",
    "http://api.openai.com/v1/responses",
    "https://api.openai.com:444/v1/responses",
    "https://api.openai.com/v1/files",
    "https://api.openai.com/v1/responses?redirect=https://unexpected.invalid",
    "https://generativelanguage.googleapis.com/v1beta/interactions/%2e%2e/secrets",
  ]) await assert.rejects(send(url, request), /allowlist/);
  assert.equal(calls, 0);
});

test("an already aborted call sends no bytes to the fixture", async t => {
  const f = await fixture(t, (_, res) => res.end("unexpected"));
  await assert.rejects(f.send(endpoint, { ...request, signal: AbortSignal.abort() }), ModelTransportError);
  assert.equal(f.dispatches(), 0);
});

test("exception provenance is bounded and excludes messages, stack, arbitrary fields and cycles", () => {
  const error: Record<string, unknown> = { name: "TypeError", code: "TOP", message: "PRIVATE", stack: "PRIVATE", cause: { name: "HeadersTimeoutError", code: "UND_ERR_HEADERS_TIMEOUT" } };
  (error.cause as Record<string, unknown>).cause = error;
  assert.deepEqual(transportException(error), { name: "TypeError", code: "TOP", cause: { name: "HeadersTimeoutError", code: "UND_ERR_HEADERS_TIMEOUT", cause: null } });
  assert.equal(transportException({ name: "sk-secret-key", code: "has private spaces" })!.name, null);
});
