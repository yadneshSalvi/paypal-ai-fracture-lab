import type { ParamPair, StyledParam } from "./param-value.js";
export declare function percentEncode(value: string): string;
export declare function formEncode(value: string): string;
export declare function queryString(layers: ReadonlyArray<readonly StyledParam[]>): string;
export declare function formString(fields?: ReadonlyArray<StyledParam>): string;
export declare function serializePairs(pairs: ReadonlyArray<ParamPair>, encode: (value: string) => string): string;
