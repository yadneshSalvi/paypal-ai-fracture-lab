import test from "node:test";
import assert from "node:assert/strict";
import type { SqlDatabase } from "@fracture/paypal-core";
import { POST, GET, OPTIONS } from "../apps/web/app/api/mcp/route";
import { developerBearer } from "../packages/developer-tools/src/remote/credential";
import { fixture } from "./remote-mcp-fixture";

test("the production Next route binds the configured origin and existing service without minting credentials", async t => {
  const f = await fixture(t);
  const global = globalThis as typeof globalThis & { fractureApplicationDatabase?: Promise<SqlDatabase> };
  const previous = global.fractureApplicationDatabase;
  const keys = ["FRACTURE_REMOTE_MCP_ORIGIN", "FRACTURE_REMOTE_MCP_ALLOW_LOOPBACK", "FRACTURE_DURABLE_WORKFLOW", "VERCEL"];
  const env = keys.map(key => process.env[key]);
  global.fractureApplicationDatabase = Promise.resolve(f.db);
  delete process.env.FRACTURE_REMOTE_MCP_ORIGIN; delete process.env.FRACTURE_DURABLE_WORKFLOW; delete process.env.VERCEL;
  t.after(() => {
    if (previous) global.fractureApplicationDatabase = previous; else delete global.fractureApplicationDatabase;
    for (let i = 0; i < keys.length; i++) { if (env[i] === undefined) delete process.env[keys[i]!]; else process.env[keys[i]!] = env[i]; }
  });
  const headers = { authorization: `Bearer ${developerBearer(f.owner.credential)}`, "content-type": "application/json", accept: "application/json, text/event-stream" };
  const make = () => new Request(f.endpoint, { method: "POST", headers, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }) });
  assert.equal((await POST(make())).status, 503);
  process.env.FRACTURE_REMOTE_MCP_ORIGIN = f.origin;
  process.env.FRACTURE_REMOTE_MCP_ALLOW_LOOPBACK = "1";
  assert.equal((await POST(make())).status, 200);
  assert.equal((await GET(new Request(f.endpoint, { headers }))).status, 405);
  assert.equal((await OPTIONS(new Request(f.endpoint, { method: "OPTIONS" }))).status, 401);
  await f.access.revoke(f.owner.credential);
  assert.equal((await POST(make())).status, 401);
  assert.equal((await f.db.query("SELECT id FROM lab_developer_grants")).rowCount, 1);
  assert.equal((await f.db.query("SELECT id FROM lab_runs")).rowCount, 0);
});
