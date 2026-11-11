import type { Schema } from "../core/validation/schema.js";
import { type Address } from "./address.js";
import { type CardBrand } from "./card-brand.js";
import { type VaultCardExperienceContext } from "./vault-card-experience-context.js";
import { type VaultCardVerificationMethod } from "./vault-card-verification-method.js";
export type SetupTokenRequestCard = {
    name?: string;
    number?: string;
    expiry?: string;
    securityCode?: string;
    brand?: CardBrand;
    billingAddress?: Address;
    verificationMethod?: VaultCardVerificationMethod;
    experienceContext?: VaultCardExperienceContext;
};
export declare const setupTokenRequestCardSchema: Schema<SetupTokenRequestCard>;
