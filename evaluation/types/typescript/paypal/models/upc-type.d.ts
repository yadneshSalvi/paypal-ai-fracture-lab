import type { EnumSchema } from "../core/validation/schema.js";
export declare const UpcType: {
    readonly UpcA: "UPC-A";
    readonly UpcB: "UPC-B";
    readonly UpcC: "UPC-C";
    readonly UpcD: "UPC-D";
    readonly UpcE: "UPC-E";
    readonly Upc2: "UPC-2";
    readonly Upc5: "UPC-5";
};
export type UpcType = (typeof UpcType)[keyof typeof UpcType] | (string & {});
export declare const upcTypeSchema: EnumSchema<UpcType>;
