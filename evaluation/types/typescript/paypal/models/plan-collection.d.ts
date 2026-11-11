import type { Schema } from "../core/validation/schema.js";
import { type BillingPlan } from "./billing-plan.js";
import { type LinkDescription } from "./link-description.js";
export type PlanCollection = {
    plans?: BillingPlan[];
    totalItems?: number;
    totalPages?: number;
    links?: LinkDescription[];
};
export declare const planCollectionSchema: Schema<PlanCollection>;
