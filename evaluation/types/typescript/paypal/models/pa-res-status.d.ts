import type { EnumSchema } from "../core/validation/schema.js";
export declare const PaResStatus: {
    readonly Y: "Y";
    readonly N: "N";
    readonly U: "U";
    readonly A: "A";
    readonly C: "C";
    readonly R: "R";
    readonly D: "D";
    readonly I: "I";
};
export type PaResStatus = (typeof PaResStatus)[keyof typeof PaResStatus] | (string & {});
export declare const paResStatusSchema: EnumSchema<PaResStatus>;
