import type { ClientOptions } from "./client-options.js";
import type { AuthScheme } from "./core/api-request.js";
import type { RawClient } from "./core/raw-client.js";
import type { Servers } from "./servers.js";
export type AuthSchemes = {
    readonly oauth2: AuthScheme;
};
export declare function buildAuthSchemes(options: ClientOptions, servers: Servers, rawClient: RawClient): AuthSchemes;
