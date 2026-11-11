import type { AuthScheme } from "../api-request.js";
import type { OAuth2RefreshableTokenStrategy, OAuth2TokenStrategy } from "./oauth2-strategies.js";
export declare function oauth2Scheme<TCredentials>(credentials: TCredentials | undefined, strategy: OAuth2TokenStrategy<TCredentials>): AuthScheme;
export declare function oauth2RefreshableScheme<TCredentials>(credentials: TCredentials | undefined, strategy: OAuth2RefreshableTokenStrategy<TCredentials>): AuthScheme;
