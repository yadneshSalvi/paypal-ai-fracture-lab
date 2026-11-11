import type { Schema } from "../core/validation/schema.js";
export type ActivityTimestamps = {
    createTime?: string;
    updateTime?: string;
};
export declare const activityTimestampsSchema: Schema<ActivityTimestamps>;
