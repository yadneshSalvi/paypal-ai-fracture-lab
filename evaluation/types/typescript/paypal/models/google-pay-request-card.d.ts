import type { Schema } from "../core/validation/schema.js";
import { type Address } from "./address.js";
import { type CardBrand } from "./card-brand.js";
import { type CardType } from "./card-type.js";
export type GooglePayRequestCard = {
    name?: string;
    type?: CardType;
    brand?: CardBrand;
    billingAddress?: Address;
};
export declare const googlePayRequestCardSchema: Schema<GooglePayRequestCard>;
