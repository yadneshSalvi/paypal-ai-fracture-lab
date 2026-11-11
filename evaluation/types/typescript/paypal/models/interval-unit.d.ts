import type { EnumSchema } from "../core/validation/schema.js";
export declare const IntervalUnit: {
    readonly Day: "DAY";
    readonly Week: "WEEK";
    readonly Month: "MONTH";
    readonly Year: "YEAR";
};
export type IntervalUnit = (typeof IntervalUnit)[keyof typeof IntervalUnit] | (string & {});
export declare const intervalUnitSchema: EnumSchema<IntervalUnit>;
