import type { ClientOptions } from "./client-options.js";
import type { UrlTemplate } from "./core/api-request.js";
export type Servers = {
    default: <Path extends string>(subPath: Path) => UrlTemplate<Path>;
};
export declare function buildServers(options: ClientOptions): Servers;
