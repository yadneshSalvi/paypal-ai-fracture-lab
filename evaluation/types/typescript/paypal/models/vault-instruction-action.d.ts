import type { EnumSchema } from "../core/validation/schema.js";
export declare const VaultInstructionAction: {
    readonly OnCreatePaymentTokens: "ON_CREATE_PAYMENT_TOKENS";
    readonly OnPayerApproval: "ON_PAYER_APPROVAL";
};
export type VaultInstructionAction = (typeof VaultInstructionAction)[keyof typeof VaultInstructionAction] | (string & {});
export declare const vaultInstructionActionSchema: EnumSchema<VaultInstructionAction>;
