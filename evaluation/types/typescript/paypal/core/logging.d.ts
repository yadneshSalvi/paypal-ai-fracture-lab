export declare const logLevels: readonly [
    "off",
    "error",
    "warn",
    "info",
    "debug"
];
export declare const defaultLoggingOptions: ResolvedLoggingOptions;
export type LoggingOptions = {
    readonly logger?: Logger;
    readonly level?: LogLevel;
    readonly logRequestHeaders?: boolean;
    readonly logResponseHeaders?: boolean;
    readonly logRequestBody?: boolean;
    readonly bodySizeLimit?: number;
    readonly loggableContentTypes?: readonly string[];
    readonly redactedHeaders?: readonly string[];
    readonly unmaskHeaders?: readonly string[];
    readonly redactedKeys?: readonly string[];
    readonly redactionPlaceholder?: string;
};
export type RequestLoggingOptions = Pick<LoggingOptions, "level">;
export type Logger = {
    error(message: string, details: LogDetails): void;
    warn(message: string, details: LogDetails): void;
    info(message: string, details: LogDetails): void;
    debug(message: string, details: LogDetails): void;
};
export type LogDetails = HttpRequestDetails | RequestHeadersDetails | RequestBodyDetails | HttpResponseDetails | ResponseHeadersDetails | HttpRetryingDetails | HttpFailedDetails;
export type HttpRequestDetails = {
    readonly event: "HttpRequest";
    readonly method: string;
    readonly url: string;
};
export type RequestHeadersDetails = {
    readonly event: "RequestHeaders";
    readonly [header: string]: string;
};
export type RequestBodyDetails = {
    readonly event: "RequestBody";
    readonly mediaType: string;
    readonly body: string;
};
export type HttpResponseDetails = {
    readonly event: "HttpResponse";
    readonly method: string;
    readonly url: string;
    readonly status: number;
    readonly durationMs: number;
};
export type ResponseHeadersDetails = {
    readonly event: "ResponseHeaders";
    readonly [header: string]: string;
};
export type HttpRetryingDetails = {
    readonly event: "HttpRetrying";
    readonly method: string;
    readonly url: string;
    readonly delayMs: number;
    readonly retry: number;
    readonly maxRetries: number;
} & ({
    readonly reason: "status";
    readonly status: number;
} | {
    readonly reason: "fault";
    readonly errorName: string;
});
export type HttpFailedDetails = {
    readonly event: "HttpFailed";
    readonly method: string;
    readonly url: string;
    readonly durationMs: number;
    readonly errorName: string;
};
export type LogSeverity = "error" | "warn" | "info" | "debug";
export type LogLevel = LogSeverity | "off";
export type ResolvedLoggingOptions = Required<LoggingOptions>;
export declare function buildLoggingOptions(options: LoggingOptions | undefined, environmentVariable: string): ResolvedLoggingOptions;
