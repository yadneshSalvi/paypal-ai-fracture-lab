import type { EnumSchema } from "../core/validation/schema.js";
export declare const VaultCardVerificationMethod: {
    readonly ScaWhenRequired: "SCA_WHEN_REQUIRED";
    readonly ScaAlways: "SCA_ALWAYS";
};
export type VaultCardVerificationMethod = (typeof VaultCardVerificationMethod)[keyof typeof VaultCardVerificationMethod] | (string & {});
export declare const vaultCardVerificationMethodSchema: EnumSchema<VaultCardVerificationMethod>;
