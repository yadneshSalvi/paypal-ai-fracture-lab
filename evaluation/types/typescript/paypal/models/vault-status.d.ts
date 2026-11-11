import type { EnumSchema } from "../core/validation/schema.js";
export declare const VaultStatus: {
    readonly Vaulted: "VAULTED";
    readonly Created: "CREATED";
    readonly Approved: "APPROVED";
};
export type VaultStatus = (typeof VaultStatus)[keyof typeof VaultStatus] | (string & {});
export declare const vaultStatusSchema: EnumSchema<VaultStatus>;
