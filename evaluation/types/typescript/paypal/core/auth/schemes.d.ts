import type { AuthParams, AuthScheme, HttpMethod } from "../api-request.js";
import type { BasicAuthCredentials, TokenProvider } from "./credentials.js";
import type { RequestHeaders } from "../headers.js";
import type { RequestUrl } from "../url.js";
import type { HttpLogger } from "../http-logger.js";
export declare const noneAuth: AuthScheme;
export declare function bearerAuth(token: TokenProvider | undefined): AuthScheme;
export declare function basicAuth(credentials: BasicAuthCredentials | undefined): AuthScheme;
export declare function apiKeyHeaderAuth(config: {
    name: string;
    token: TokenProvider | undefined;
}): AuthScheme;
export declare function apiKeyQueryAuth(config: {
    name: string;
    token: TokenProvider | undefined;
}): AuthScheme;
export declare function apiKeyCookieAuth(config: {
    name: string;
    token: TokenProvider | undefined;
}): AuthScheme;
export declare function allAuth(...schemes: readonly AuthScheme[]): AuthScheme;
export declare function anyAuth(...schemes: readonly AuthScheme[]): AuthScheme;
export type AuthenticatedRequest = {
    readonly url: URL;
    readonly headers: Headers;
};
export declare function authenticateRequest(method: HttpMethod, auth: AuthScheme, url: RequestUrl, headers: RequestHeaders, signal: AbortSignal, startedAt: number, logger: HttpLogger): Promise<AuthenticatedRequest>;
export declare function header(name: string, value: string): AuthParams;
export declare function basicCredential(username: string, password: string): string;
export declare function base64(bytes: Uint8Array): string;
