import type { EnumSchema } from "../core/validation/schema.js";
export declare const VaultTokenRequestType: {
    readonly SetupToken: "SETUP_TOKEN";
};
export type VaultTokenRequestType = (typeof VaultTokenRequestType)[keyof typeof VaultTokenRequestType] | (string & {});
export declare const vaultTokenRequestTypeSchema: EnumSchema<VaultTokenRequestType>;
