import type { EnumSchema } from "../core/validation/schema.js";
export declare const CardVerificationStatus: {
    readonly Verified: "VERIFIED";
    readonly Failed: "FAILED";
};
export type CardVerificationStatus = (typeof CardVerificationStatus)[keyof typeof CardVerificationStatus] | (string & {});
export declare const cardVerificationStatusSchema: EnumSchema<CardVerificationStatus>;
