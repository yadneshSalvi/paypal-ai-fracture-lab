import type { AuthSchemes } from "../auth-schemes.js";
import { ApiError, type Declared, type ErrorDecoders, type ErrorPayload } from "../core/api-error.js";
import type { ApiPromise } from "../core/api-promise.js";
import type { RequestOptions } from "../core/api-request.js";
import type { RawClient } from "../core/raw-client.js";
import { type CustomerVaultPaymentTokensResponse } from "../models/customer-vault-payment-tokens-response.js";
import { type Error } from "../models/error.js";
import { type PaymentTokenRequest } from "../models/payment-token-request.js";
import { type PaymentTokenResponse } from "../models/payment-token-response.js";
import { type SetupTokenRequest } from "../models/setup-token-request.js";
import { type SetupTokenResponse } from "../models/setup-token-response.js";
import type { Servers } from "../servers.js";
export declare class Vault {
    #private;
    constructor(rawClient: RawClient, servers: Servers, auth: AuthSchemes);
    createPaymentToken(request: Vault.CreatePaymentTokenRequest, options?: RequestOptions): ApiPromise<PaymentTokenResponse, Vault.CreatePaymentTokenError>;
    createSetupToken(request: Vault.CreateSetupTokenRequest, options?: RequestOptions): ApiPromise<SetupTokenResponse, Vault.CreateSetupTokenError>;
    deletePaymentToken(request: Vault.DeletePaymentTokenRequest, options?: RequestOptions): ApiPromise<undefined, Vault.DeletePaymentTokenError>;
    getPaymentToken(request: Vault.GetPaymentTokenRequest, options?: RequestOptions): ApiPromise<PaymentTokenResponse, Vault.GetPaymentTokenError>;
    getSetupToken(request: Vault.GetSetupTokenRequest, options?: RequestOptions): ApiPromise<SetupTokenResponse, Vault.GetSetupTokenError>;
    listCustomerPaymentTokens(request: Vault.ListCustomerPaymentTokensRequest, options?: RequestOptions): ApiPromise<CustomerVaultPaymentTokensResponse, Vault.ListCustomerPaymentTokensError>;
}
export declare namespace Vault {
    type CreatePaymentTokenRequest = {
        payPalRequestId?: string;
        body: PaymentTokenRequest;
    };
    class CreatePaymentTokenError extends ApiError {
        readonly payload: ErrorPayload<Declared<"error", Error> | Declared<"error2", Error> | Declared<"error3", Error> | Declared<"error4", Error> | Declared<"error5", Error>>;
        static readonly errors: ErrorDecoders<CreatePaymentTokenError>;
    }
    type CreateSetupTokenRequest = {
        payPalRequestId?: string;
        body: SetupTokenRequest;
    };
    class CreateSetupTokenError extends ApiError {
        readonly payload: ErrorPayload<Declared<"error", Error> | Declared<"error2", Error> | Declared<"error3", Error> | Declared<"error4", Error>>;
        static readonly errors: ErrorDecoders<CreateSetupTokenError>;
    }
    type DeletePaymentTokenRequest = {
        id: string;
    };
    class DeletePaymentTokenError extends ApiError {
        readonly payload: ErrorPayload<Declared<"error", Error> | Declared<"error2", Error> | Declared<"error3", Error>>;
        static readonly errors: ErrorDecoders<DeletePaymentTokenError>;
    }
    type GetPaymentTokenRequest = {
        id: string;
    };
    class GetPaymentTokenError extends ApiError {
        readonly payload: ErrorPayload<Declared<"error", Error> | Declared<"error2", Error> | Declared<"error3", Error> | Declared<"error4", Error>>;
        static readonly errors: ErrorDecoders<GetPaymentTokenError>;
    }
    type GetSetupTokenRequest = {
        id: string;
    };
    class GetSetupTokenError extends ApiError {
        readonly payload: ErrorPayload<Declared<"error", Error> | Declared<"error2", Error> | Declared<"error3", Error> | Declared<"error4", Error>>;
        static readonly errors: ErrorDecoders<GetSetupTokenError>;
    }
    type ListCustomerPaymentTokensRequest = {
        customerId: string;
        pageSize?: number;
        page?: number;
        totalRequired?: boolean;
    };
    class ListCustomerPaymentTokensError extends ApiError {
        readonly payload: ErrorPayload<Declared<"error", Error> | Declared<"error2", Error> | Declared<"error3", Error>>;
        static readonly errors: ErrorDecoders<ListCustomerPaymentTokensError>;
    }
}
