import type { EnumSchema } from "../core/validation/schema.js";
export declare const TenureType: {
    readonly Regular: "REGULAR";
    readonly Trial: "TRIAL";
};
export type TenureType = (typeof TenureType)[keyof typeof TenureType] | (string & {});
export declare const tenureTypeSchema: EnumSchema<TenureType>;
