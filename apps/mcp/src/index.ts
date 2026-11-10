import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { getService, type LabService } from "../../../packages/service/src/index";
import { DeveloperAccess, readCredential } from "../../../packages/developer-tools/src/access";
import { DeveloperRuntime, safeDeveloperError } from "../../../packages/developer-tools/src/runtime";
import { createDeveloperMcp } from "./server";

let service: LabService | undefined;
try {
  service = await getService();
  const access = new DeveloperAccess(service);
  await access.initialize();
  const credential = await readCredential();
  await access.authorize(credential);
  const server = createDeveloperMcp(new DeveloperRuntime(service, credential));
  let closing = false;
  const close = async () => { if (closing) return; closing = true; await server.close(); await service?.store.db.close(); };
  server.server.onclose = () => { void close(); };
  for (const signal of ["SIGINT", "SIGTERM"] as const) process.on(signal, () => { void close().finally(() => { process.exitCode = 0; }); });
  await server.connect(new StdioServerTransport());
} catch (error) { await service?.store.db.close(); process.stderr.write(JSON.stringify(safeDeveloperError(error)) + "\n"); process.exitCode = 1; }
