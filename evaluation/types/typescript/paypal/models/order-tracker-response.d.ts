import type { Schema } from "../core/validation/schema.js";
import { type LinkDescription } from "./link-description.js";
import { type OrderTrackerItem } from "./order-tracker-item.js";
import { type OrderTrackerStatus } from "./order-tracker-status.js";
export type OrderTrackerResponse = {
    id?: string;
    status?: OrderTrackerStatus;
    items?: OrderTrackerItem[];
    links?: LinkDescription[];
    createTime?: string;
    updateTime?: string;
};
export declare const orderTrackerResponseSchema: Schema<OrderTrackerResponse>;
