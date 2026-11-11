import type { Schema } from "../core/validation/schema.js";
import { type AppSwitchContext } from "./app-switch-context.js";
import { ExperienceContextShippingPreference } from "./experience-context-shipping-preference.js";
import { type VaultInstructionAction } from "./vault-instruction-action.js";
import { VaultUserAction } from "./vault-user-action.js";
export type VaultExperienceContext = {
    brandName?: string;
    locale?: string;
    returnUrl?: string;
    cancelUrl?: string;
    shippingPreference?: ExperienceContextShippingPreference;
    vaultInstruction?: VaultInstructionAction;
    appSwitchContext?: AppSwitchContext;
    userAction?: VaultUserAction;
};
export declare const vaultExperienceContextSchema: Schema<VaultExperienceContext>;
