// Trusted worker entrypoint. Imported repository contents are data, never module specifiers.
import { parentPort, workerData } from "node:worker_threads";
import { register } from "tsx/esm/api";

const unregister = register();
try {
  const { inspectTypeScript, inspectDeclaredTools } = await import("./typescript-inspector.ts");
  const { GraphBuilder } = await import("./graph.ts");
  const builder = new GraphBuilder(workerData.limits);
  const tools = [];
  for (const source of workerData.sources) {
    if (["typescript", "javascript"].includes(source.manifest.language)) builder.merge(inspectTypeScript(source, workerData.limits));
    tools.push(...inspectDeclaredTools(source, workerData.limits));
    if (tools.length > workerData.limits.maxGraphNodes) throw Object.assign(new Error(), { code: "SOURCE_PARSER_LIMIT" });
  }
  parentPort.postMessage({ ok: true, fragment: builder.fragment(), tools });
} catch (error) {
  parentPort.postMessage({ ok: false, code: error?.code === "SOURCE_PARSE_FAILED" ? "SOURCE_PARSE_FAILED" : "SOURCE_PARSER_LIMIT" });
} finally { unregister(); }
