import type { Schema } from "../core/validation/schema.js";
import { type VenmoWalletAdditionalAttributes } from "./venmo-wallet-additional-attributes.js";
import { type VenmoWalletExperienceContext } from "./venmo-wallet-experience-context.js";
export type VenmoWalletRequest = {
    vaultId?: string;
    emailAddress?: string;
    experienceContext?: VenmoWalletExperienceContext;
    attributes?: VenmoWalletAdditionalAttributes;
};
export declare const venmoWalletRequestSchema: Schema<VenmoWalletRequest>;
