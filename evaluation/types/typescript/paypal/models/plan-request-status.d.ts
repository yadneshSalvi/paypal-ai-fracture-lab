import type { EnumSchema } from "../core/validation/schema.js";
export declare const PlanRequestStatus: {
    readonly Created: "CREATED";
    readonly Inactive: "INACTIVE";
    readonly Active: "ACTIVE";
};
export type PlanRequestStatus = (typeof PlanRequestStatus)[keyof typeof PlanRequestStatus] | (string & {});
export declare const planRequestStatusSchema: EnumSchema<PlanRequestStatus>;
