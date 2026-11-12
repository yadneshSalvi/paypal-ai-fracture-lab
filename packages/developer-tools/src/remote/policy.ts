import { LabError } from "../../../service/src/errors";

export const REMOTE_MCP_PATH = "/api/mcp";
export const REMOTE_MCP_MAX_REQUEST_BYTES = 32 * 1024;
export const REMOTE_MCP_MAX_RESPONSE_BYTES = 64 * 1024 * 1024;
export const REMOTE_MCP_REQUEST_TIMEOUT_MS = 230_000;

export function remoteOrigin(input: string | undefined, allowLoopback = false): URL {
  try {
    if (!input || input.length > 2048 || input.trim() !== input) throw new Error();
    const url = new URL(input);
    const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    if (url.username || url.password || url.search || url.hash || url.pathname !== "/" || ![url.origin, url.origin + "/"].includes(input)) throw new Error();
    if (loopback ? !allowLoopback || !["https:", "http:"].includes(url.protocol) : url.protocol !== "https:") throw new Error();
    return url;
  } catch {
    throw new LabError("REMOTE_MCP_ORIGIN_INVALID", "Configure one explicit HTTPS origin. HTTP loopback requires the deliberate local test setting.", 503);
  }
}

/** Reads bytes before JSON parsing. Does not trust Content-Length alone. */
export async function boundedBytes(body: ReadableStream<Uint8Array> | null, maximum: number): Promise<Uint8Array> {
  if (!body) return new Uint8Array();
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      length += chunk.value.byteLength;
      if (length > maximum) {
        await reader.cancel();
        throw new LabError("REMOTE_MCP_BODY_TOO_LARGE", "The remote MCP message exceeds its byte limit.", 413);
      }
      chunks.push(chunk.value);
    }
    return Buffer.concat(chunks, length);
  } finally { reader.releaseLock(); }
}

export function checkDeclaredLength(headers: Headers, maximum: number) {
  const value = headers.get("content-length");
  if (value !== null && (!/^(0|[1-9][0-9]*)$/.test(value) || !Number.isSafeInteger(Number(value)))) throw new LabError("REMOTE_MCP_LENGTH_INVALID", "The message length is invalid.", 400);
  if (value !== null && Number(value) > maximum) throw new LabError("REMOTE_MCP_BODY_TOO_LARGE", "The remote MCP message exceeds its byte limit.", 413);
}
