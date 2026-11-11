import type { EnumSchema } from "../core/validation/schema.js";
export declare const ReasonCode: {
    readonly PaymentDenied: "PAYMENT_DENIED";
    readonly InternalServerError: "INTERNAL_SERVER_ERROR";
    readonly PayeeAccountRestricted: "PAYEE_ACCOUNT_RESTRICTED";
    readonly PayerAccountRestricted: "PAYER_ACCOUNT_RESTRICTED";
    readonly PayerCannotPay: "PAYER_CANNOT_PAY";
    readonly SendingLimitExceeded: "SENDING_LIMIT_EXCEEDED";
    readonly TransactionReceivingLimitExceeded: "TRANSACTION_RECEIVING_LIMIT_EXCEEDED";
    readonly CurrencyMismatch: "CURRENCY_MISMATCH";
};
export type ReasonCode = (typeof ReasonCode)[keyof typeof ReasonCode] | (string & {});
export declare const reasonCodeSchema: EnumSchema<ReasonCode>;
