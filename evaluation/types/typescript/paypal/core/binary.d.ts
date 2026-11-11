import type { HttpMethod } from "./api-request.js";
import type { BinaryResponseDecoder } from "./response-decoder.js";
export type BinaryData = Blob | Uint8Array<ArrayBuffer> | ArrayBuffer | ReadableStream<Uint8Array> | AsyncIterable<Uint8Array<ArrayBuffer>>;
export type FileData = {
    readonly data: BinaryData;
    readonly fileName?: string | undefined;
    readonly contentType?: string | undefined;
};
export type FileInput = BinaryData | FileData;
export type BufferedResolvedFile = {
    readonly body: Blob | Uint8Array<ArrayBuffer>;
    readonly contentType: string | undefined;
    readonly fileName: string | undefined;
    readonly streaming: false;
};
export type StreamingResolvedFile = {
    readonly body: ReadableStream<Uint8Array>;
    readonly contentType: string | undefined;
    readonly fileName: string | undefined;
    readonly streaming: true;
};
export type ResolvedFile = BufferedResolvedFile | StreamingResolvedFile;
export type ByteSource = Blob | Uint8Array<ArrayBuffer> | ReadableStream<Uint8Array>;
export type BinaryErrorContent = {
    readonly bytes: Uint8Array<ArrayBuffer>;
    readonly contentType: string | undefined;
    readonly fileName: string | undefined;
};
export type BinaryContent = {
    readonly stream: ReadableStream<Uint8Array<ArrayBuffer>>;
    readonly contentType: string;
    readonly fileName: string | undefined;
};
export declare function readBinary(decoder: BinaryResponseDecoder, response: Response): BinaryContent;
export declare function readBinaryError(response: Response, method: HttpMethod, uri: string): Promise<BinaryErrorContent>;
export declare function resolveFile(input: FileInput, declaredContentType: string | undefined, signal?: AbortSignal): ResolvedFile;
export declare function concatStream(sources: readonly ByteSource[], signal: AbortSignal | undefined): ReadableStream<Uint8Array>;
export declare function attachmentDisposition(fileName: string | undefined): string | undefined;
export declare function parseFileName(disposition: string | null): string | undefined;
