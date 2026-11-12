import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { DeveloperRuntime, safeDeveloperError, toolDefinitions } from "../../../packages/developer-tools/src/runtime";

export function createDeveloperMcp(runtime: DeveloperRuntime) {
  const server = new McpServer({ name: "fracture-lab", version: "0.1.0" }, { instructions: "Keep controlled Sample capabilities, published provider evidence and actual financial Sandbox receipts distinct. Curated experiments and separately approved adapted imported TypeScript closures are distinct execution lanes. Source preparation seals the exact closure, unchanged public suite, runner and fixed deadline; explicit approval creates one durable job. No live financial operations, package scripts or dependency installation are available. Browser source and receipt views require separate read-only approval. Recover original command and job identities after an unknown answer; never replace or replay an uncertain execution. A failed test stays failed after remediation." });
  for (const [name, definition] of Object.entries(toolDefinitions)) {
    server.registerTool(name, { description: definition.description, inputSchema: definition.schema, annotations: { readOnlyHint: definition.readOnly, destructiveHint: false, openWorldHint: ["diagnose_run","propose_repair"].includes(name) } }, async (args: unknown) => {
      try { return { content: [{ type: "text" as const, text: JSON.stringify(await runtime.call(name, args)) }] }; }
      catch (error) { return { isError: true, content: [{ type: "text" as const, text: JSON.stringify(safeDeveloperError(error)) }] }; }
    });
  }
  return server;
}
