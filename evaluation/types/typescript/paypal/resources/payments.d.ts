import type { AuthSchemes } from "../auth-schemes.js";
import { ApiError, type Declared, type ErrorDecoders, type ErrorPayload } from "../core/api-error.js";
import type { ApiPromise } from "../core/api-promise.js";
import type { RequestOptions } from "../core/api-request.js";
import type { RawClient } from "../core/raw-client.js";
import { type CaptureRequest } from "../models/capture-request.js";
import { type CapturedPayment } from "../models/captured-payment.js";
import { type Error } from "../models/error.js";
import { type PaymentAuthorization } from "../models/payment-authorization.js";
import { type ReauthorizeRequest } from "../models/reauthorize-request.js";
import { type RefundRequest } from "../models/refund-request.js";
import { type Refund } from "../models/refund.js";
import type { Servers } from "../servers.js";
export declare class Payments {
    #private;
    constructor(rawClient: RawClient, servers: Servers, auth: AuthSchemes);
    captureAuthorizedPayment(request: Payments.CaptureAuthorizedPaymentRequest, options?: RequestOptions): ApiPromise<CapturedPayment, Payments.CaptureAuthorizedPaymentError>;
    getAuthorizedPayment(request: Payments.GetAuthorizedPaymentRequest, options?: RequestOptions): ApiPromise<PaymentAuthorization, Payments.GetAuthorizedPaymentError>;
    getCapturedPayment(request: Payments.GetCapturedPaymentRequest, options?: RequestOptions): ApiPromise<CapturedPayment, Payments.GetCapturedPaymentError>;
    getRefund(request: Payments.GetRefundRequest, options?: RequestOptions): ApiPromise<Refund, Payments.GetRefundError>;
    reauthorizePayment(request: Payments.ReauthorizePaymentRequest, options?: RequestOptions): ApiPromise<PaymentAuthorization, Payments.ReauthorizePaymentError>;
    refundCapturedPayment(request: Payments.RefundCapturedPaymentRequest, options?: RequestOptions): ApiPromise<Refund, Payments.RefundCapturedPaymentError>;
    voidPayment(request: Payments.VoidPaymentRequest, options?: RequestOptions): ApiPromise<PaymentAuthorization, Payments.VoidPaymentError>;
}
export declare namespace Payments {
    type CaptureAuthorizedPaymentRequest = {
        authorizationId: string;
        payPalMockResponse?: string;
        payPalRequestId?: string;
        prefer?: string;
        payPalAuthAssertion?: string;
        body?: CaptureRequest;
    };
    class CaptureAuthorizedPaymentError extends ApiError {
        readonly payload: ErrorPayload<Declared<"error", Error> | Declared<"error2", Error> | Declared<"error3", Error> | Declared<"error4", Error> | Declared<"error5", Error> | Declared<"error6", Error> | Declared<"error500", undefined> | Declared<"error7", Error>>;
        static readonly errors: ErrorDecoders<CaptureAuthorizedPaymentError>;
    }
    type GetAuthorizedPaymentRequest = {
        authorizationId: string;
        payPalMockResponse?: string;
        payPalAuthAssertion?: string;
    };
    class GetAuthorizedPaymentError extends ApiError {
        readonly payload: ErrorPayload<Declared<"error", Error> | Declared<"error2", Error> | Declared<"error3", Error> | Declared<"error500", undefined> | Declared<"error4", Error>>;
        static readonly errors: ErrorDecoders<GetAuthorizedPaymentError>;
    }
    type GetCapturedPaymentRequest = {
        captureId: string;
        payPalMockResponse?: string;
    };
    class GetCapturedPaymentError extends ApiError {
        readonly payload: ErrorPayload<Declared<"error", Error> | Declared<"error2", Error> | Declared<"error3", Error> | Declared<"error500", undefined> | Declared<"error4", Error>>;
        static readonly errors: ErrorDecoders<GetCapturedPaymentError>;
    }
    type GetRefundRequest = {
        refundId: string;
        payPalMockResponse?: string;
        payPalAuthAssertion?: string;
    };
    class GetRefundError extends ApiError {
        readonly payload: ErrorPayload<Declared<"error", Error> | Declared<"error2", Error> | Declared<"error3", Error> | Declared<"error500", undefined> | Declared<"error4", Error>>;
        static readonly errors: ErrorDecoders<GetRefundError>;
    }
    type ReauthorizePaymentRequest = {
        authorizationId: string;
        payPalRequestId?: string;
        prefer?: string;
        payPalAuthAssertion?: string;
        body?: ReauthorizeRequest;
    };
    class ReauthorizePaymentError extends ApiError {
        readonly payload: ErrorPayload<Declared<"error", Error> | Declared<"error2", Error> | Declared<"error3", Error> | Declared<"error4", Error> | Declared<"error5", Error> | Declared<"error500", undefined> | Declared<"error6", Error>>;
        static readonly errors: ErrorDecoders<ReauthorizePaymentError>;
    }
    type RefundCapturedPaymentRequest = {
        captureId: string;
        payPalMockResponse?: string;
        payPalRequestId?: string;
        prefer?: string;
        payPalAuthAssertion?: string;
        body?: RefundRequest;
    };
    class RefundCapturedPaymentError extends ApiError {
        readonly payload: ErrorPayload<Declared<"error", Error> | Declared<"error2", Error> | Declared<"error3", Error> | Declared<"error4", Error> | Declared<"error5", Error> | Declared<"error6", Error> | Declared<"error500", undefined> | Declared<"error7", Error>>;
        static readonly errors: ErrorDecoders<RefundCapturedPaymentError>;
    }
    type VoidPaymentRequest = {
        authorizationId: string;
        payPalMockResponse?: string;
        payPalAuthAssertion?: string;
        payPalRequestId?: string;
        prefer?: string;
    };
    class VoidPaymentError extends ApiError {
        readonly payload: ErrorPayload<Declared<"error", Error> | Declared<"error2", Error> | Declared<"error3", Error> | Declared<"error4", Error> | Declared<"error5", Error> | Declared<"error500", undefined> | Declared<"error6", Error>>;
        static readonly errors: ErrorDecoders<VoidPaymentError>;
    }
}
