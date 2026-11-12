import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { JSONRPCMessage, JSONRPCRequest } from "@modelcontextprotocol/sdk/types.js";
import { developerBearer, readPrivateDeveloperCredential } from "../../../packages/developer-tools/src/remote/credential";
import { createPinnedRemoteFetch } from "../../../packages/developer-tools/src/remote/pinned-fetch";
import { remoteOrigin, REMOTE_MCP_MAX_REQUEST_BYTES, REMOTE_MCP_PATH } from "../../../packages/developer-tools/src/remote/policy";

const diagnostic = () => process.stderr.write("Fracture remote MCP: acknowledgement unavailable; inspect retained state and keep the original requestId. No automatic retry was sent.\n");
const isRequest = (message: JSONRPCMessage): message is JSONRPCRequest => "method" in message && "id" in message;

export async function startRemoteBridge() {
  const origin = remoteOrigin(process.env.FRACTURE_REMOTE_MCP_ORIGIN, process.env.FRACTURE_REMOTE_MCP_ALLOW_LOOPBACK === "1");
  const path = process.env.FRACTURE_DEVELOPER_CREDENTIAL_FILE ?? resolve(import.meta.dirname, "../../../.local/developer-session.json");
  const credential = await readPrivateDeveloperCredential(path);
  const bearer = developerBearer(credential);
  const stdio = new StdioServerTransport(process.stdin, process.stdout, { maxBufferSize: REMOTE_MCP_MAX_REQUEST_BYTES });
  const remote = new StreamableHTTPClientTransport(new URL(REMOTE_MCP_PATH, origin), {
    fetch: createPinnedRemoteFetch(origin, credential),
    requestInit: { redirect: "manual", credentials: "omit" },
    // No authProvider: a refusal never refreshes credentials or repeats POST.
    reconnectionOptions: { maxRetries: 0, initialReconnectionDelay: 1000, maxReconnectionDelay: 1000, reconnectionDelayGrowFactor: 1 },
  });
  let closing = false;
  let pending = 0;
  const close = async () => {
    if (closing) return;
    closing = true;
    process.stdin.off("end", onEnd);
    process.off("SIGINT", onEnd);
    process.off("SIGTERM", onEnd);
    await remote.close();
    await stdio.close();
  };
  const onEnd = () => { void close(); };
  const unknown = async (message: JSONRPCMessage) => {
    if (!closing && isRequest(message)) await stdio.send({ jsonrpc: "2.0", id: message.id, error: { code: -32000, message: "Remote acknowledgement unavailable. Read retained state with the original grant before retrying; keep the identical requestId and body.", data: { code: "REMOTE_ACKNOWLEDGEMENT_UNKNOWN", automaticRetry: false, commandMayHaveBeenAccepted: true } } });
  };
  remote.onmessage = message => {
    const text = JSON.stringify(message);
    if (text.includes(credential.secret) || text.includes(bearer)) { diagnostic(); void close(); return; }
    if ("result" in message && typeof message.result.protocolVersion === "string") remote.setProtocolVersion(message.result.protocolVersion);
    void stdio.send(message).catch(() => { diagnostic(); void close(); });
  };
  remote.onerror = () => { if (!closing) diagnostic(); };
  stdio.onerror = () => { diagnostic(); void close(); };
  stdio.onclose = onEnd;
  stdio.onmessage = message => {
    if (closing) return;
    if (pending >= 8) { diagnostic(); void unknown(message); return; }
    pending++;
    void remote.send(message).catch(() => unknown(message)).catch(() => { void close(); }).finally(() => { pending--; });
  };
  process.stdin.once("end", onEnd);
  process.once("SIGINT", onEnd);
  process.once("SIGTERM", onEnd);
  await remote.start();
  await stdio.start();
  return { close };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    if (process.argv.length !== 2) throw new Error();
    await startRemoteBridge();
  } catch {
    process.stderr.write("Fracture remote MCP could not start. Check the explicit HTTPS origin and owner-only developer credential file. No secret or server configuration is printed.\n");
    process.exitCode = 1;
  }
}
