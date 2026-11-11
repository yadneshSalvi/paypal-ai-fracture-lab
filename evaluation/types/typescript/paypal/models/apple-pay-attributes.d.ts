import type { Schema } from "../core/validation/schema.js";
import { type CustomerInformation } from "./customer-information.js";
import { type VaultInstruction } from "./vault-instruction.js";
export type ApplePayAttributes = {
    customer?: CustomerInformation;
    vault?: VaultInstruction;
};
export declare const applePayAttributesSchema: Schema<ApplePayAttributes>;
