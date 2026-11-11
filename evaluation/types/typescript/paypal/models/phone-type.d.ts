import type { EnumSchema } from "../core/validation/schema.js";
export declare const PhoneType: {
    readonly Fax: "FAX";
    readonly Home: "HOME";
    readonly Mobile: "MOBILE";
    readonly Other: "OTHER";
    readonly Pager: "PAGER";
};
export type PhoneType = (typeof PhoneType)[keyof typeof PhoneType] | (string & {});
export declare const phoneTypeSchema: EnumSchema<PhoneType>;
