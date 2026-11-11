import type { EnumSchema } from "../core/validation/schema.js";
export declare const VaultUserAction: {
    readonly SetupNow: "SETUP_NOW";
    readonly Continue: "CONTINUE";
};
export type VaultUserAction = (typeof VaultUserAction)[keyof typeof VaultUserAction] | (string & {});
export declare const vaultUserActionSchema: EnumSchema<VaultUserAction>;
