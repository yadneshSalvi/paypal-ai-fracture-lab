import type { Schema } from "../core/validation/schema.js";
export type MerchantPreferences = {
    returnUrl?: string;
    cancelUrl?: string;
};
export declare const merchantPreferencesSchema: Schema<MerchantPreferences>;
