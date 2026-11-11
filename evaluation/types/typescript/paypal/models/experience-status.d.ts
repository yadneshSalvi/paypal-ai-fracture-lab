import type { EnumSchema } from "../core/validation/schema.js";
export declare const ExperienceStatus: {
    readonly NotStarted: "NOT_STARTED";
    readonly InProgress: "IN_PROGRESS";
    readonly Canceled: "CANCELED";
    readonly Approved: "APPROVED";
};
export type ExperienceStatus = (typeof ExperienceStatus)[keyof typeof ExperienceStatus] | (string & {});
export declare const experienceStatusSchema: EnumSchema<ExperienceStatus>;
