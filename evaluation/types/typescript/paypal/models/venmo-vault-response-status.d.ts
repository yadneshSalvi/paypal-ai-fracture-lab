import type { EnumSchema } from "../core/validation/schema.js";
export declare const VenmoVaultResponseStatus: {
    readonly Vaulted: "VAULTED";
    readonly Created: "CREATED";
    readonly Approved: "APPROVED";
};
export type VenmoVaultResponseStatus = (typeof VenmoVaultResponseStatus)[keyof typeof VenmoVaultResponseStatus] | (string & {});
export declare const venmoVaultResponseStatusSchema: EnumSchema<VenmoVaultResponseStatus>;
