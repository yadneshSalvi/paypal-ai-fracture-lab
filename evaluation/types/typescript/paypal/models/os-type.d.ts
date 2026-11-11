import type { EnumSchema } from "../core/validation/schema.js";
export declare const OsType: {
    readonly Android: "ANDROID";
    readonly Ios: "IOS";
    readonly Other: "OTHER";
};
export type OsType = (typeof OsType)[keyof typeof OsType] | (string & {});
export declare const osTypeSchema: EnumSchema<OsType>;
