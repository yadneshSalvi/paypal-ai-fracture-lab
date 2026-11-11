import type { EnumSchema } from "../core/validation/schema.js";
export declare const CvvCode: {
    readonly E: "E";
    readonly I: "I";
    readonly M: "M";
    readonly N: "N";
    readonly P: "P";
    readonly S: "S";
    readonly U: "U";
    readonly X: "X";
    readonly AllOthers: "All others";
    readonly _0: "0";
    readonly _1: "1";
    readonly _2: "2";
    readonly _3: "3";
    readonly _4: "4";
};
export type CvvCode = (typeof CvvCode)[keyof typeof CvvCode] | (string & {});
export declare const cvvCodeSchema: EnumSchema<CvvCode>;
