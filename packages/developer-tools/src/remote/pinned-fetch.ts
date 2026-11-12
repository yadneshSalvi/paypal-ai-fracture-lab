import type { FetchLike } from "@modelcontextprotocol/sdk/shared/transport.js";
import { LabError } from "../../../service/src/errors";
import { developerBearer, type DeveloperCredential } from "./credential";
import { boundedBytes, checkDeclaredLength, REMOTE_MCP_MAX_REQUEST_BYTES, REMOTE_MCP_MAX_RESPONSE_BYTES, REMOTE_MCP_PATH, REMOTE_MCP_REQUEST_TIMEOUT_MS } from "./policy";

/** Defense in depth around the SDK's fetch seam, including its optional GET. */
export function createPinnedRemoteFetch(origin: URL, credential: DeveloperCredential, underlying: FetchLike = fetch, timeoutMs = REMOTE_MCP_REQUEST_TIMEOUT_MS): FetchLike {
  const endpoint = new URL(REMOTE_MCP_PATH, origin).href;
  const bearer = developerBearer(credential);
  return async (input, init = {}) => {
    if (new URL(input).href !== endpoint || !["GET", "POST", "DELETE"].includes(init.method ?? "GET")) throw new LabError("REMOTE_MCP_DESTINATION_DENIED", "The bridge accepts only its pinned MCP endpoint.", 403);
    if (init.body !== undefined && init.body !== null && (typeof init.body !== "string" || Buffer.byteLength(init.body) > REMOTE_MCP_MAX_REQUEST_BYTES)) throw new LabError("REMOTE_MCP_BODY_TOO_LARGE", "The remote MCP message exceeds its byte limit.", 413);
    const sourceHeaders = new Headers(init.headers);
    const headers = new Headers({ authorization: `Bearer ${bearer}` });
    for (const name of ["accept", "content-type", "mcp-protocol-version"]) {
      const value = sourceHeaders.get(name);
      if (value !== null) headers.set(name, value);
    }
    const response = await underlying(endpoint, {
      method: init.method ?? "GET", headers, ...(typeof init.body === "string" ? { body: init.body } : {}),
      signal: AbortSignal.any([...(init.signal ? [init.signal] : []), AbortSignal.timeout(timeoutMs)]),
      redirect: "manual", credentials: "omit", cache: "no-store",
    });
    // Reject every redirect, even same-origin 307/308: following it could repeat
    // a command or put the bearer at another path. Never log Location or bodies.
    if (response.redirected || response.status >= 300 && response.status < 400 || response.url && response.url !== endpoint) {
      await response.body?.cancel();
      throw new LabError("REMOTE_MCP_REDIRECT_DENIED", "The pinned MCP endpoint returned a redirect. No redirect was followed.", 502);
    }
    try {
      checkDeclaredLength(response.headers, REMOTE_MCP_MAX_RESPONSE_BYTES);
      const bytes = await boundedBytes(response.body, REMOTE_MCP_MAX_RESPONSE_BYTES);
      const resultHeaders = new Headers();
      // Cookies, auth challenges, session IDs and arbitrary diagnostic headers
      // never become local client configuration or credentials.
      const contentType = response.headers.get("content-type");
      if (contentType) resultHeaders.set("content-type", contentType);
      return new Response([202, 204, 205, 304].includes(response.status) ? null : new Uint8Array(bytes).buffer, { status: response.status, headers: resultHeaders });
    } catch (error) {
      if (!response.body?.locked) await response.body?.cancel().catch(() => {});
      throw error;
    }
  };
}
