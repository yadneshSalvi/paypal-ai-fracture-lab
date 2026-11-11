import type { Entry } from "./validation/schema.js";
export type ParamStyle = "plain" | "indexed" | "unindexed" | "csv" | "tsv" | "psv";
export type ParamValue = string | number | boolean | bigint | null | undefined | readonly ParamValue[] | {
    readonly [key: string]: ParamValue;
};
export type Param<Name extends string = string> = {
    readonly name: Name;
    readonly value: unknown;
    readonly schema: Entry<unknown>;
};
export type StyledParam = Param & {
    readonly style?: ParamStyle | undefined;
};
export type ParamPair = readonly [
    name: string,
    value: string
];
export declare function flattenValue(value: ParamValue): string[];
export declare function encodedParam(source: Param): ParamValue;
export declare function flattenParams(sources?: ReadonlyArray<StyledParam>): ParamPair[];
export declare function isScalar(value: ParamValue): value is string | number | boolean | bigint;
export declare function scalar(value: string | number | boolean | bigint): string;
export declare function jsonValue(value: ParamValue): string;
