import type { Schema } from "../core/validation/schema.js";
import { type Address } from "./address.js";
import { type AuthenticationResponse } from "./authentication-response.js";
import { type CardBrand } from "./card-brand.js";
import { type CardType } from "./card-type.js";
export type GooglePayCardResponse = {
    name?: string;
    lastDigits?: string;
    type?: CardType;
    brand?: CardBrand;
    billingAddress?: Address;
    authenticationResult?: AuthenticationResponse;
};
export declare const googlePayCardResponseSchema: Schema<GooglePayCardResponse>;
