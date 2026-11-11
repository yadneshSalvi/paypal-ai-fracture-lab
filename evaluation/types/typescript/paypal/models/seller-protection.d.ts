import type { Schema } from "../core/validation/schema.js";
import { type DisputeCategory } from "./dispute-category.js";
import { type SellerProtectionStatus } from "./seller-protection-status.js";
export type SellerProtection = {
    status?: SellerProtectionStatus;
    disputeCategories?: DisputeCategory[];
};
export declare const sellerProtectionSchema: Schema<SellerProtection>;
