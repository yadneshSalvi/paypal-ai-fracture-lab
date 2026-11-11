import type { Schema } from "../core/validation/schema.js";
import { type CardCustomer } from "./card-customer.js";
import { type CardVerification } from "./card-verification.js";
import { type VaultInstructionBase } from "./vault-instruction-base.js";
export type SubscriptionsCardAttributes = {
    customer?: CardCustomer;
    vault?: VaultInstructionBase;
    verification?: CardVerification;
};
export declare const subscriptionsCardAttributesSchema: Schema<SubscriptionsCardAttributes>;
