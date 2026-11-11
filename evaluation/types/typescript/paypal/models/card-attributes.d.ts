import type { Schema } from "../core/validation/schema.js";
import { type CardCustomerInformation } from "./card-customer-information.js";
import { type CardVerification } from "./card-verification.js";
import { type VaultInstructionBase } from "./vault-instruction-base.js";
export type CardAttributes = {
    customer?: CardCustomerInformation;
    vault?: VaultInstructionBase;
    verification?: CardVerification;
};
export declare const cardAttributesSchema: Schema<CardAttributes>;
