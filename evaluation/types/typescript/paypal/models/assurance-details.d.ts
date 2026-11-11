import type { Schema } from "../core/validation/schema.js";
export type AssuranceDetails = {
    accountVerified?: boolean;
    cardHolderAuthenticated?: boolean;
};
export declare const assuranceDetailsSchema: Schema<AssuranceDetails>;
