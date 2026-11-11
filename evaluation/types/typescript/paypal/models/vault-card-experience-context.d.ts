import type { Schema } from "../core/validation/schema.js";
import { type VaultInstructionAction } from "./vault-instruction-action.js";
import { VaultUserAction } from "./vault-user-action.js";
export type VaultCardExperienceContext = {
    brandName?: string;
    locale?: string;
    returnUrl?: string;
    cancelUrl?: string;
    vaultInstruction?: VaultInstructionAction;
    userAction?: VaultUserAction;
};
export declare const vaultCardExperienceContextSchema: Schema<VaultCardExperienceContext>;
