import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { DeveloperRuntime, safeDeveloperError, toolDefinitions } from "../../../packages/developer-tools/src/runtime";

export function createDeveloperMcp(runtime: DeveloperRuntime) {
  const server = new McpServer({ name: "fracture-lab", version: "0.1.0" }, { instructions: "Fracture Lab executes curated Sample experiments only. Keep Sample, published provider evidence, and actual sandbox receipts distinct. No tool can submit live financial operations, accept arbitrary source code, or execute a generated patch. A failed test stays failed after remediation." });
  for (const [name, definition] of Object.entries(toolDefinitions)) {
    server.registerTool(name, { description: definition.description, inputSchema: definition.schema, annotations: { readOnlyHint: definition.readOnly, destructiveHint: false, openWorldHint: name === "diagnose_run" } }, async (args: unknown) => {
      try { return { content: [{ type: "text" as const, text: JSON.stringify(await runtime.call(name, args)) }] }; }
      catch (error) { return { isError: true, content: [{ type: "text" as const, text: JSON.stringify(safeDeveloperError(error)) }] }; }
    });
  }
  return server;
}
