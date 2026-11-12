import test from "node:test";
import type { TestContext } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, rm, stat } from "node:fs/promises";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { journaledProviderFetch, JournalDispatchExists } from "../scripts/runtime-qualification-journal";

const endpoint = "https://api.openai.com/v1/responses";
const request = { method: "POST", headers: { authorization: "Bearer fixture-header-never-retain", "content-type": "application/json" }, body: '{"model":"fixture","input":[]}' };
const digest = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");
async function setup(t: TestContext) {
  const directory = await mkdtemp(join(tmpdir(), "fracture-provider-journal-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  return directory;
}
async function entries(directory: string) {
  const name = (await readdir(join(directory, "case"))).find(value => value.startsWith("mutation-"))!;
  const root = join(directory, "case", name);
  return { root, events: (await readFile(join(root, "events.ndjson"), "utf8")).trim().split("\n").map(line => JSON.parse(line) as Record<string, unknown>) };
}

test("the exact private intent is durable before dispatch and chunks reconstruct the provider body", async t => {
  const directory = await setup(t);
  const wire: typeof fetch = async (_input, init) => {
    const retained = await entries(directory);
    assert.equal(retained.events[0]?.type, "dispatch_started");
    assert.equal(await readFile(join(retained.root, "request.json"), "utf8"), init?.body);
    const intent = await readFile(join(retained.root, "intent.json"), "utf8");
    assert.ok(!intent.includes("fixture-header-never-retain"));
    assert.equal((await stat(join(retained.root, "request.json"))).mode & 0o077, 0);
    return new Response(new ReadableStream({ start(controller) { controller.enqueue(new TextEncoder().encode("first\n")); controller.enqueue(new TextEncoder().encode("second")); controller.close(); } }), { headers: { "content-type": "text/event-stream", "x-request-id": "req_fixture" } });
  };
  const result = await journaledProviderFetch({ directory, namespace: "case", fetchImpl: wire })(endpoint, request);
  assert.equal(await result.text(), "first\nsecond");
  const { root, events } = await entries(directory);
  const bytes = await readFile(join(root, "response.bin"));
  assert.equal(bytes.toString(), "first\nsecond");
  let offset = 0;
  for (const chunk of events.filter(event => event.type === "response_chunk")) {
    assert.equal(chunk.offset, offset);
    assert.equal(chunk.sha256, digest(bytes.subarray(offset, offset + Number(chunk.bytes)))); offset += Number(chunk.bytes);
  }
  assert.equal(events.at(-1)?.responseSha256, digest(bytes));
  assert.equal(events.at(-1)?.type, "response_completed");
});

test("concurrent and fresh processes cannot submit a retained unknown mutation twice", async t => {
  const directory = await setup(t);
  let dispatches = 0;
  const wire: typeof fetch = async () => { dispatches++; throw Object.assign(new TypeError("fixture key must not enter an error receipt"), { cause: Object.assign(new Error(), { code: "UND_ERR_HEADERS_TIMEOUT" }) }); };
  const fetcher = journaledProviderFetch({ directory, namespace: "case", fetchImpl: wire });
  const results = await Promise.allSettled([fetcher(endpoint, request), fetcher(endpoint, request)]);
  assert.equal(dispatches, 1);
  assert.ok(results.some(result => result.status === "rejected" && result.reason instanceof JournalDispatchExists));
  await assert.rejects(journaledProviderFetch({ directory, namespace: "case", fetchImpl: wire })(endpoint, request), JournalDispatchExists);
  const { events } = await entries(directory);
  assert.equal(events.at(-1)?.type, "dispatch_unknown");
  assert.ok(JSON.stringify(events).includes("UND_ERR_HEADERS_TIMEOUT"));
  assert.ok(!JSON.stringify(events).includes("fixture key"));
});

test("stopping after a terminal event retains a prefix without claiming a full response hash", async t => {
  const directory = await setup(t);
  let cancelled = 0;
  const wire: typeof fetch = async () => new Response(new ReadableStream({ start(controller) { controller.enqueue(new TextEncoder().encode("terminal\n")); }, cancel() { cancelled++; } }));
  const result = await journaledProviderFetch({ directory, namespace: "case", fetchImpl: wire })(endpoint, request);
  const reader = result.body!.getReader();
  await reader.read(); await reader.cancel();
  const { events } = await entries(directory);
  assert.equal(cancelled, 1);
  assert.equal(events.at(-1)?.type, "consumer_stopped");
  assert.equal(events.at(-1)?.completeBody, false);
  assert.equal(events.at(-1)?.responsePrefixSha256, digest("terminal\n"));
  assert.equal(events.at(-1)?.responseSha256, undefined);
});

test("safe polls are separate GET receipts, never a replacement create", async t => {
  const directory = await setup(t);
  const methods: string[] = [];
  const wire: typeof fetch = async (_input, init) => { methods.push(init?.method ?? "GET"); return Response.json({ id: "resp_original", status: "in_progress" }); };
  const fetcher = journaledProviderFetch({ directory, namespace: "case", fetchImpl: wire });
  await (await fetcher(`${endpoint}/resp_original`)).text();
  await (await fetcher(`${endpoint}/resp_original`)).text();
  assert.deepEqual(methods, ["GET", "GET"]);
  assert.equal((await readdir(join(directory, "case"))).filter(name => name.startsWith("read-")).length, 2);
});
