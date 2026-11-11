export type TokenProvider = string | ((signal: AbortSignal) => string | Promise<string>);
export type BasicAuthCredentials = {
    readonly username: string;
    readonly password: string;
};
export type OAuth2ClientCredentials = {
    readonly clientId: string;
    readonly clientSecret: string;
    readonly scope?: string | undefined;
};
export type OAuth2PasswordCredentials = {
    readonly clientId: string;
    readonly clientSecret?: string | undefined;
    readonly username: string;
    readonly password: string;
    readonly scope?: string | undefined;
};
export declare const PkceMethod: {
    readonly S256: "S256";
    readonly Plain: "plain";
};
export type PkceMethod = (typeof PkceMethod)[keyof typeof PkceMethod];
export type AuthorizationCodePrompt = (authorizationUrl: string, signal: AbortSignal) => Promise<string>;
export type OAuth2AuthorizationCodeCredentials = {
    readonly clientId: string;
    readonly clientSecret?: string | undefined;
    readonly redirectUri: string;
    readonly scope?: string | undefined;
    readonly state?: string | undefined;
    readonly pkce?: PkceMethod | null | undefined;
    readonly promptForAuthorizationCode: AuthorizationCodePrompt;
};
