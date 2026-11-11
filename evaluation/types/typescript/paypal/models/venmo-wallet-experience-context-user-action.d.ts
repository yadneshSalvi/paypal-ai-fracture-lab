import type { EnumSchema } from "../core/validation/schema.js";
export declare const VenmoWalletExperienceContextUserAction: {
    readonly Continue: "CONTINUE";
    readonly PayNow: "PAY_NOW";
};
export type VenmoWalletExperienceContextUserAction = (typeof VenmoWalletExperienceContextUserAction)[keyof typeof VenmoWalletExperienceContextUserAction] | (string & {});
export declare const venmoWalletExperienceContextUserActionSchema: EnumSchema<VenmoWalletExperienceContextUserAction>;
