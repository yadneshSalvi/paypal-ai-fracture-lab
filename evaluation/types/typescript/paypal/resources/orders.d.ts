import type { AuthSchemes } from "../auth-schemes.js";
import { ApiError, type Declared, type ErrorDecoders, type ErrorPayload } from "../core/api-error.js";
import type { ApiPromise } from "../core/api-promise.js";
import type { RequestOptions } from "../core/api-request.js";
import type { RawClient } from "../core/raw-client.js";
import { type ConfirmOrderRequest } from "../models/confirm-order-request.js";
import { type Error } from "../models/error.js";
import { type OrderAuthorizeRequest } from "../models/order-authorize-request.js";
import { type OrderAuthorizeResponse } from "../models/order-authorize-response.js";
import { type OrderCaptureRequest } from "../models/order-capture-request.js";
import { type OrderRequest } from "../models/order-request.js";
import { type OrderTrackerRequest } from "../models/order-tracker-request.js";
import { type Order } from "../models/order.js";
import { type Patch } from "../models/patch.js";
import type { Servers } from "../servers.js";
export declare class Orders {
    #private;
    constructor(rawClient: RawClient, servers: Servers, auth: AuthSchemes);
    authorizeOrder(request: Orders.AuthorizeOrderRequest, options?: RequestOptions): ApiPromise<OrderAuthorizeResponse, Orders.AuthorizeOrderError>;
    captureOrder(request: Orders.CaptureOrderRequest, options?: RequestOptions): ApiPromise<Order, Orders.CaptureOrderError>;
    confirmOrder(request: Orders.ConfirmOrderRequestParams, options?: RequestOptions): ApiPromise<Order, Orders.ConfirmOrderError>;
    createOrder(request: Orders.CreateOrderRequest, options?: RequestOptions): ApiPromise<Order, Orders.CreateOrderError>;
    createOrderTracking(request: Orders.CreateOrderTrackingRequest, options?: RequestOptions): ApiPromise<Order, Orders.CreateOrderTrackingError>;
    getOrder(request: Orders.GetOrderRequest, options?: RequestOptions): ApiPromise<Order, Orders.GetOrderError>;
    patchOrder(request: Orders.PatchOrderRequest, options?: RequestOptions): ApiPromise<undefined, Orders.PatchOrderError>;
    updateOrderTracking(request: Orders.UpdateOrderTrackingRequest, options?: RequestOptions): ApiPromise<undefined, Orders.UpdateOrderTrackingError>;
}
export declare namespace Orders {
    type AuthorizeOrderRequest = {
        id: string;
        payPalMockResponse?: string;
        payPalRequestId?: string;
        prefer?: string;
        payPalClientMetadataId?: string;
        payPalAuthAssertion?: string;
        body?: OrderAuthorizeRequest;
    };
    class AuthorizeOrderError extends ApiError {
        readonly payload: ErrorPayload<Declared<"error", Error> | Declared<"error2", Error> | Declared<"error3", Error> | Declared<"error4", Error> | Declared<"error5", Error> | Declared<"error6", Error> | Declared<"error7", Error>>;
        static readonly errors: ErrorDecoders<AuthorizeOrderError>;
    }
    type CaptureOrderRequest = {
        id: string;
        payPalMockResponse?: string;
        payPalRequestId?: string;
        prefer?: string;
        payPalClientMetadataId?: string;
        payPalAuthAssertion?: string;
        body?: OrderCaptureRequest;
    };
    class CaptureOrderError extends ApiError {
        readonly payload: ErrorPayload<Declared<"error", Error> | Declared<"error2", Error> | Declared<"error3", Error> | Declared<"error4", Error> | Declared<"error5", Error> | Declared<"error6", Error> | Declared<"error7", Error>>;
        static readonly errors: ErrorDecoders<CaptureOrderError>;
    }
    type ConfirmOrderRequestParams = {
        id: string;
        payPalClientMetadataId?: string;
        payPalAuthAssertion?: string;
        prefer?: string;
        body?: ConfirmOrderRequest;
    };
    class ConfirmOrderError extends ApiError {
        readonly payload: ErrorPayload<Declared<"error", Error> | Declared<"error2", Error> | Declared<"error3", Error> | Declared<"error4", Error> | Declared<"error5", Error>>;
        static readonly errors: ErrorDecoders<ConfirmOrderError>;
    }
    type CreateOrderRequest = {
        payPalMockResponse?: string;
        payPalRequestId?: string;
        payPalPartnerAttributionId?: string;
        payPalClientMetadataId?: string;
        prefer?: string;
        payPalAuthAssertion?: string;
        body: OrderRequest;
    };
    class CreateOrderError extends ApiError {
        readonly payload: ErrorPayload<Declared<"error", Error> | Declared<"error2", Error> | Declared<"error3", Error> | Declared<"error4", Error>>;
        static readonly errors: ErrorDecoders<CreateOrderError>;
    }
    type CreateOrderTrackingRequest = {
        id: string;
        payPalAuthAssertion?: string;
        body: OrderTrackerRequest;
    };
    class CreateOrderTrackingError extends ApiError {
        readonly payload: ErrorPayload<Declared<"error", Error> | Declared<"error2", Error> | Declared<"error3", Error> | Declared<"error4", Error> | Declared<"error5", Error> | Declared<"error6", Error>>;
        static readonly errors: ErrorDecoders<CreateOrderTrackingError>;
    }
    type GetOrderRequest = {
        id: string;
        fields?: string;
        payPalMockResponse?: string;
        payPalAuthAssertion?: string;
    };
    class GetOrderError extends ApiError {
        readonly payload: ErrorPayload<Declared<"error", Error> | Declared<"error2", Error> | Declared<"error3", Error>>;
        static readonly errors: ErrorDecoders<GetOrderError>;
    }
    type PatchOrderRequest = {
        id: string;
        payPalMockResponse?: string;
        payPalAuthAssertion?: string;
        body?: Patch[];
    };
    class PatchOrderError extends ApiError {
        readonly payload: ErrorPayload<Declared<"error", Error> | Declared<"error2", Error> | Declared<"error3", Error> | Declared<"error4", Error> | Declared<"error5", Error>>;
        static readonly errors: ErrorDecoders<PatchOrderError>;
    }
    type UpdateOrderTrackingRequest = {
        id: string;
        trackerId: string;
        payPalAuthAssertion?: string;
        body?: Patch[];
    };
    class UpdateOrderTrackingError extends ApiError {
        readonly payload: ErrorPayload<Declared<"error", Error> | Declared<"error2", Error> | Declared<"error3", Error> | Declared<"error4", Error> | Declared<"error5", Error> | Declared<"error6", Error>>;
        static readonly errors: ErrorDecoders<UpdateOrderTrackingError>;
    }
}
