import type { Schema } from "../core/validation/schema.js";
import { type CallbackConfiguration } from "./callback-configuration.js";
import { VenmoWalletExperienceContextShippingPreference } from "./venmo-wallet-experience-context-shipping-preference.js";
import { VenmoWalletExperienceContextUserAction } from "./venmo-wallet-experience-context-user-action.js";
export type VenmoWalletExperienceContext = {
    brandName?: string;
    shippingPreference?: VenmoWalletExperienceContextShippingPreference;
    orderUpdateCallbackConfig?: CallbackConfiguration;
    userAction?: VenmoWalletExperienceContextUserAction;
};
export declare const venmoWalletExperienceContextSchema: Schema<VenmoWalletExperienceContext>;
