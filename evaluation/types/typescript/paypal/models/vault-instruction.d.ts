import type { Schema } from "../core/validation/schema.js";
import { type StoreInVaultInstruction } from "./store-in-vault-instruction.js";
export type VaultInstruction = {
    storeInVault: StoreInVaultInstruction;
};
export declare const vaultInstructionSchema: Schema<VaultInstruction>;
