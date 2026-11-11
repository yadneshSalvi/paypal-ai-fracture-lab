import type { EnumSchema } from "../core/validation/schema.js";
export declare const StandardEntryClassCode: {
    readonly Tel: "TEL";
    readonly Web: "WEB";
    readonly Ccd: "CCD";
    readonly Ppd: "PPD";
};
export type StandardEntryClassCode = (typeof StandardEntryClassCode)[keyof typeof StandardEntryClassCode] | (string & {});
export declare const standardEntryClassCodeSchema: EnumSchema<StandardEntryClassCode>;
