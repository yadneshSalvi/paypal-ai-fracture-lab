import type { EnumSchema } from "../core/validation/schema.js";
export declare const StoreInVaultInstruction: {
    readonly OnSuccess: "ON_SUCCESS";
};
export type StoreInVaultInstruction = (typeof StoreInVaultInstruction)[keyof typeof StoreInVaultInstruction] | (string & {});
export declare const storeInVaultInstructionSchema: EnumSchema<StoreInVaultInstruction>;
