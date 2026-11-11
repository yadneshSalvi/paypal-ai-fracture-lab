import type { EnumSchema } from "../core/validation/schema.js";
export declare const ProcessingInstruction: {
    readonly OrderCompleteOnPaymentApproval: "ORDER_COMPLETE_ON_PAYMENT_APPROVAL";
};
export type ProcessingInstruction = (typeof ProcessingInstruction)[keyof typeof ProcessingInstruction] | (string & {});
export declare const processingInstructionSchema: EnumSchema<ProcessingInstruction>;
