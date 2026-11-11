import type { UrlTemplate } from "../api-request.js";
import type { RawClient } from "../raw-client.js";
import type { Schema } from "../validation/schema.js";
import type { OAuth2AuthorizationCodeCredentials, OAuth2ClientCredentials, OAuth2PasswordCredentials } from "./credentials.js";
export type OAuthToken = {
    accessToken: string;
    tokenType: string;
    expiresIn?: number;
    scope?: string;
};
export declare const oauthTokenSchema: Schema<OAuthToken>;
export type OAuthTokenRefreshable = OAuthToken & {
    refreshToken?: string;
};
export declare const oauthTokenRefreshableSchema: Schema<OAuthTokenRefreshable>;
export type OAuth2TokenStrategy<TCredentials> = {
    getToken(credentials: TCredentials, signal: AbortSignal): Promise<OAuthToken>;
};
export type OAuth2RefreshableTokenStrategy<TCredentials> = {
    getToken(credentials: TCredentials, signal: AbortSignal): Promise<OAuthTokenRefreshable>;
    tryRefreshToken(credentials: TCredentials, refreshToken: string, signal: AbortSignal): Promise<OAuthTokenRefreshable | null>;
};
export type OAuth2CredentialPlacement = "header" | "body";
export declare function oauth2ClientCredentialsStrategy(config: {
    tokenUrl: UrlTemplate;
    rawClient: RawClient;
    placement?: OAuth2CredentialPlacement;
}): OAuth2TokenStrategy<OAuth2ClientCredentials>;
export declare function oauth2PasswordStrategy(config: {
    tokenUrl: UrlTemplate;
    rawClient: RawClient;
    placement?: OAuth2CredentialPlacement;
}): OAuth2TokenStrategy<OAuth2PasswordCredentials>;
export declare function oauth2AuthorizationCodeStrategy(config: {
    authorizationUrl: UrlTemplate;
    tokenUrl: UrlTemplate;
    rawClient: RawClient;
    placement?: OAuth2CredentialPlacement;
}): OAuth2RefreshableTokenStrategy<OAuth2AuthorizationCodeCredentials>;
