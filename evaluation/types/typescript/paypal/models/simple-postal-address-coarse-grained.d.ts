import type { Schema } from "../core/validation/schema.js";
export type SimplePostalAddressCoarseGrained = {
    line1: string;
    line2?: string;
    city: string;
    state?: string;
    countryCode: string;
    postalCode?: string;
};
export declare const simplePostalAddressCoarseGrainedSchema: Schema<SimplePostalAddressCoarseGrained>;
