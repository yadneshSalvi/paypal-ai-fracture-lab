import type { EnumSchema } from "../core/validation/schema.js";
export declare const TokenType: {
    readonly BillingAgreement: "BILLING_AGREEMENT";
};
export type TokenType = (typeof TokenType)[keyof typeof TokenType] | (string & {});
export declare const tokenTypeSchema: EnumSchema<TokenType>;
