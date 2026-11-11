import type { Schema } from "../core/validation/schema.js";
import { type StoreInVaultInstruction } from "./store-in-vault-instruction.js";
export type VaultInstructionBase = {
    storeInVault?: StoreInVaultInstruction;
};
export declare const vaultInstructionBaseSchema: Schema<VaultInstructionBase>;
