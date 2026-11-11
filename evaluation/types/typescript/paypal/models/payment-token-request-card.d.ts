import type { Schema } from "../core/validation/schema.js";
import { type Address } from "./address.js";
import { type CardBrand } from "./card-brand.js";
export type PaymentTokenRequestCard = {
    name?: string;
    number?: string;
    expiry?: string;
    securityCode?: string;
    brand?: CardBrand;
    billingAddress?: Address;
};
export declare const paymentTokenRequestCardSchema: Schema<PaymentTokenRequestCard>;
