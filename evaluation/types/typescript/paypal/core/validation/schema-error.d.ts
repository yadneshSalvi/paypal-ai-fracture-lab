import type { ZodMiniType } from "zod/v4-mini";
import type { Entry } from "./schema.js";
export declare class SchemaError extends Error {
    constructor(message: string, cause?: unknown);
}
export declare function decodeWith<T>(zodType: ZodMiniType<T, unknown>, value: unknown): T;
export declare function encodeWith<T, W>(zodType: ZodMiniType<T, W>, value: unknown): W;
export declare function decodeEntry<V>(schema: Entry<V>, value: unknown): V;
export declare function encodeEntry<V, W>(schema: Entry<V, W>, value: unknown): W;
