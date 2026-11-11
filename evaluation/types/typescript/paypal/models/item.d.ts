import type { Schema } from "../core/validation/schema.js";
import { type ItemCategory } from "./item-category.js";
import { type Money } from "./money.js";
import { type OrderBillingPlan } from "./order-billing-plan.js";
import { type UniversalProductCode } from "./universal-product-code.js";
export type Item = {
    name: string;
    unitAmount: Money;
    tax?: Money;
    quantity: string;
    description?: string;
    sku?: string;
    url?: string;
    category?: ItemCategory;
    imageUrl?: string;
    upc?: UniversalProductCode;
    billingPlan?: OrderBillingPlan;
};
export declare const itemSchema: Schema<Item>;
