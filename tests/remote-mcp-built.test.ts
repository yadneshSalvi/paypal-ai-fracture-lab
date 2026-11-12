import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { join } from "node:path";
import type { SqlDatabase } from "@fracture/paypal-core";
import type { RunDTO } from "../packages/contracts/src/index";
import { fixture, root, sampleArgs, textResult } from "./remote-mcp-fixture";

test("webpack production route serves real SDK HTTP initialization, Sample command and saved recovery", { skip: process.env.FRACTURE_REMOTE_MCP_BUILT !== "1" }, async t => {
  const require = createRequire(import.meta.url);
  const built = require(join(root, "apps/web/.next/server/app/api/mcp/route.js")) as { routeModule: { ensureUserland: () => Promise<void>; userland: { POST: (request: Request) => Promise<Response> } } };
  // Next 16 route userland is lazy. Use its installed module contract, rather
  // than assuming require() has completed top-level-await dependencies.
  await built.routeModule.ensureUserland();
  const f = await fixture(t, {}, request => built.routeModule.userland.POST(request));
  const global = globalThis as typeof globalThis & { fractureApplicationDatabase?: Promise<SqlDatabase> };
  const previous = global.fractureApplicationDatabase;
  const keys = ["FRACTURE_REMOTE_MCP_ORIGIN", "FRACTURE_REMOTE_MCP_ALLOW_LOOPBACK", "FRACTURE_DURABLE_WORKFLOW", "VERCEL"];
  const env = keys.map(key => process.env[key]);
  global.fractureApplicationDatabase = Promise.resolve(f.db);
  process.env.FRACTURE_REMOTE_MCP_ORIGIN = f.origin;
  process.env.FRACTURE_REMOTE_MCP_ALLOW_LOOPBACK = "1";
  delete process.env.FRACTURE_DURABLE_WORKFLOW; delete process.env.VERCEL;
  t.after(() => {
    if (previous) global.fractureApplicationDatabase = previous; else delete global.fractureApplicationDatabase;
    for (let i = 0; i < keys.length; i++) { if (env[i] === undefined) delete process.env[keys[i]!]; else process.env[keys[i]!] = env[i]; }
  });
  const { client } = await f.connect();
  assert.ok((await client.listTools()).tools.some(tool => tool.name === "get_run"));
  const run = textResult<RunDTO>(await client.callTool({ name: "run_curated_scenario", arguments: sampleArgs() }));
  assert.equal(run.source, "sample"); assert.equal(run.captureCount, 1);
  assert.equal(textResult<RunDTO>(await client.callTool({ name: "get_run", arguments: { runId: run.id } })).id, run.id);
  await f.access.revoke(f.owner.credential);
  await assert.rejects(client.listTools(), error => { assert.equal((error as { code: number }).code, 401); return true; });
});
