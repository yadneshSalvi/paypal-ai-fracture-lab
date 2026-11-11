import type { ZodMiniType } from "zod/v4-mini";
export type Encoded<T> = T extends Date ? string | number : T extends Uint8Array ? string : T extends string | number | boolean | null | undefined ? T : T extends readonly (infer E)[] ? Encoded<E>[] : T extends object ? {
    [K in keyof T]: Encoded<T[K]>;
} : T;
export type KeysMap<T> = {
    readonly [K in keyof T]?: string;
};
export type Entry<V, W = unknown> = ZodMiniType<V, W> | Schema<V, W>;
export type Shape<T> = {
    [K in keyof T]-?: Entry<T[K]>;
} & {
    readonly _keysMap?: KeysMap<T>;
};
export type Schema<T, W = Encoded<T>> = {
    readonly decode: (value: unknown) => T;
    readonly encode: (value: unknown) => W;
};
export type EnumSchema<T> = Schema<T, T> & {
    readonly values: readonly T[];
};
export declare function object<T>(shape: Shape<T>): Schema<T, Encoded<T>>;
export declare function discriminatedUnion<T>(discriminator: string, variants: Readonly<Record<string, Schema<unknown, unknown>>>): Schema<T, Encoded<T>>;
export declare function enumOf<T extends string | number>(members: Readonly<Record<string, T>>): EnumSchema<T>;
export declare function of<T, W = Encoded<T>>(zodType: ZodMiniType<T, W>): Schema<T, W>;
export declare function resolve<T>(entry: Entry<T, Encoded<T>>): ZodMiniType<T, Encoded<T>>;
