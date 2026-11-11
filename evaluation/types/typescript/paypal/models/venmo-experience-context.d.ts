import type { Schema } from "../core/validation/schema.js";
import { ExperienceContextShippingPreference } from "./experience-context-shipping-preference.js";
import { type VaultInstructionAction } from "./vault-instruction-action.js";
import { VaultUserAction } from "./vault-user-action.js";
export type VenmoExperienceContext = {
    brandName?: string;
    shippingPreference?: ExperienceContextShippingPreference;
    vaultInstruction?: VaultInstructionAction;
    userAction?: VaultUserAction;
};
export declare const venmoExperienceContextSchema: Schema<VenmoExperienceContext>;
