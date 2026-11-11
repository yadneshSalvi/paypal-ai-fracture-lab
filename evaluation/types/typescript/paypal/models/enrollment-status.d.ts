import type { EnumSchema } from "../core/validation/schema.js";
export declare const EnrollmentStatus: {
    readonly Y: "Y";
    readonly N: "N";
    readonly U: "U";
    readonly B: "B";
};
export type EnrollmentStatus = (typeof EnrollmentStatus)[keyof typeof EnrollmentStatus] | (string & {});
export declare const enrollmentStatusSchema: EnumSchema<EnrollmentStatus>;
