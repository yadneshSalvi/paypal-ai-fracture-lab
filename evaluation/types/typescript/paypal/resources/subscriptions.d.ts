import type { AuthSchemes } from "../auth-schemes.js";
import { ApiError, type Declared, type ErrorDecoders, type ErrorPayload } from "../core/api-error.js";
import type { ApiPromise } from "../core/api-promise.js";
import type { RequestOptions } from "../core/api-request.js";
import type { RawClient } from "../core/raw-client.js";
import { type ActivateSubscriptionRequest } from "../models/activate-subscription-request.js";
import { type BillingPlan } from "../models/billing-plan.js";
import { type CancelSubscriptionRequest } from "../models/cancel-subscription-request.js";
import { type CaptureSubscriptionRequest } from "../models/capture-subscription-request.js";
import { type CreateSubscriptionRequest } from "../models/create-subscription-request.js";
import { type ModifySubscriptionRequest } from "../models/modify-subscription-request.js";
import { type ModifySubscriptionResponse } from "../models/modify-subscription-response.js";
import { type Patch } from "../models/patch.js";
import { type PlanCollection } from "../models/plan-collection.js";
import { type PlanRequest } from "../models/plan-request.js";
import { type SubscriptionCollection } from "../models/subscription-collection.js";
import { type SubscriptionError } from "../models/subscription-error.js";
import { type SubscriptionTransactionDetails } from "../models/subscription-transaction-details.js";
import { type Subscription } from "../models/subscription.js";
import { type SuspendSubscription } from "../models/suspend-subscription.js";
import { type TransactionsList } from "../models/transactions-list.js";
import { type UpdatePricingSchemesRequest } from "../models/update-pricing-schemes-request.js";
import type { Servers } from "../servers.js";
export declare class Subscriptions {
    #private;
    constructor(rawClient: RawClient, servers: Servers, auth: AuthSchemes);
    activateBillingPlan(request: Subscriptions.ActivateBillingPlanRequest, options?: RequestOptions): ApiPromise<undefined, Subscriptions.ActivateBillingPlanError>;
    activateSubscription(request: Subscriptions.ActivateSubscriptionRequestParams, options?: RequestOptions): ApiPromise<undefined, Subscriptions.ActivateSubscriptionError>;
    cancelSubscription(request: Subscriptions.CancelSubscriptionRequestParams, options?: RequestOptions): ApiPromise<undefined, Subscriptions.CancelSubscriptionError>;
    captureSubscription(request: Subscriptions.CaptureSubscriptionRequestParams, options?: RequestOptions): ApiPromise<SubscriptionTransactionDetails, Subscriptions.CaptureSubscriptionError>;
    createBillingPlan(request: Subscriptions.CreateBillingPlanRequest, options?: RequestOptions): ApiPromise<BillingPlan, Subscriptions.CreateBillingPlanError>;
    createSubscription(request: Subscriptions.CreateSubscriptionRequestParams, options?: RequestOptions): ApiPromise<Subscription, Subscriptions.CreateSubscriptionError>;
    deactivateBillingPlan(request: Subscriptions.DeactivateBillingPlanRequest, options?: RequestOptions): ApiPromise<undefined, Subscriptions.DeactivateBillingPlanError>;
    getBillingPlan(request: Subscriptions.GetBillingPlanRequest, options?: RequestOptions): ApiPromise<BillingPlan, Subscriptions.GetBillingPlanError>;
    getSubscription(request: Subscriptions.GetSubscriptionRequest, options?: RequestOptions): ApiPromise<Subscription, Subscriptions.GetSubscriptionError>;
    listBillingPlans(request: Subscriptions.ListBillingPlansRequest, options?: RequestOptions): ApiPromise<PlanCollection, Subscriptions.ListBillingPlansError>;
    listSubscriptionTransactions(request: Subscriptions.ListSubscriptionTransactionsRequest, options?: RequestOptions): ApiPromise<TransactionsList, Subscriptions.ListSubscriptionTransactionsError>;
    listSubscriptions(request: Subscriptions.ListSubscriptionsRequest, options?: RequestOptions): ApiPromise<SubscriptionCollection, Subscriptions.ListSubscriptionsError>;
    patchBillingPlan(request: Subscriptions.PatchBillingPlanRequest, options?: RequestOptions): ApiPromise<undefined, Subscriptions.PatchBillingPlanError>;
    patchSubscription(request: Subscriptions.PatchSubscriptionRequest, options?: RequestOptions): ApiPromise<undefined, Subscriptions.PatchSubscriptionError>;
    reviseSubscription(request: Subscriptions.ReviseSubscriptionRequest, options?: RequestOptions): ApiPromise<ModifySubscriptionResponse, Subscriptions.ReviseSubscriptionError>;
    suspendSubscription(request: Subscriptions.SuspendSubscriptionRequest, options?: RequestOptions): ApiPromise<undefined, Subscriptions.SuspendSubscriptionError>;
    updateBillingPlanPricingSchemes(request: Subscriptions.UpdateBillingPlanPricingSchemesRequest, options?: RequestOptions): ApiPromise<undefined, Subscriptions.UpdateBillingPlanPricingSchemesError>;
}
export declare namespace Subscriptions {
    type ActivateBillingPlanRequest = {
        id: string;
    };
    class ActivateBillingPlanError extends ApiError {
        readonly payload: ErrorPayload<Declared<"subscriptionError", SubscriptionError> | Declared<"subscriptionError2", SubscriptionError> | Declared<"subscriptionError3", SubscriptionError> | Declared<"subscriptionError4", SubscriptionError> | Declared<"subscriptionError5", SubscriptionError> | Declared<"subscriptionError6", SubscriptionError>>;
        static readonly errors: ErrorDecoders<ActivateBillingPlanError>;
    }
    type ActivateSubscriptionRequestParams = {
        id: string;
        body?: ActivateSubscriptionRequest;
    };
    class ActivateSubscriptionError extends ApiError {
        readonly payload: ErrorPayload<Declared<"subscriptionError", SubscriptionError> | Declared<"subscriptionError2", SubscriptionError> | Declared<"subscriptionError3", SubscriptionError> | Declared<"subscriptionError4", SubscriptionError> | Declared<"subscriptionError5", SubscriptionError> | Declared<"subscriptionError6", SubscriptionError> | Declared<"subscriptionError7", SubscriptionError>>;
        static readonly errors: ErrorDecoders<ActivateSubscriptionError>;
    }
    type CancelSubscriptionRequestParams = {
        id: string;
        body?: CancelSubscriptionRequest;
    };
    class CancelSubscriptionError extends ApiError {
        readonly payload: ErrorPayload<Declared<"subscriptionError", SubscriptionError> | Declared<"subscriptionError2", SubscriptionError> | Declared<"subscriptionError3", SubscriptionError> | Declared<"subscriptionError4", SubscriptionError> | Declared<"subscriptionError5", SubscriptionError> | Declared<"subscriptionError6", SubscriptionError> | Declared<"subscriptionError7", SubscriptionError>>;
        static readonly errors: ErrorDecoders<CancelSubscriptionError>;
    }
    type CaptureSubscriptionRequestParams = {
        id: string;
        payPalRequestId?: string;
        body?: CaptureSubscriptionRequest;
    };
    class CaptureSubscriptionError extends ApiError {
        readonly payload: ErrorPayload<Declared<"subscriptionError", SubscriptionError> | Declared<"subscriptionError2", SubscriptionError> | Declared<"subscriptionError3", SubscriptionError> | Declared<"subscriptionError4", SubscriptionError> | Declared<"subscriptionError5", SubscriptionError> | Declared<"subscriptionError6", SubscriptionError> | Declared<"subscriptionError7", SubscriptionError>>;
        static readonly errors: ErrorDecoders<CaptureSubscriptionError>;
    }
    type CreateBillingPlanRequest = {
        prefer?: string;
        payPalRequestId?: string;
        body?: PlanRequest;
    };
    class CreateBillingPlanError extends ApiError {
        readonly payload: ErrorPayload<Declared<"subscriptionError", SubscriptionError> | Declared<"subscriptionError2", SubscriptionError> | Declared<"subscriptionError3", SubscriptionError> | Declared<"subscriptionError4", SubscriptionError> | Declared<"subscriptionError5", SubscriptionError> | Declared<"subscriptionError6", SubscriptionError>>;
        static readonly errors: ErrorDecoders<CreateBillingPlanError>;
    }
    type CreateSubscriptionRequestParams = {
        prefer?: string;
        payPalRequestId?: string;
        payPalClientMetadataId?: string;
        body?: CreateSubscriptionRequest;
    };
    class CreateSubscriptionError extends ApiError {
        readonly payload: ErrorPayload<Declared<"subscriptionError", SubscriptionError> | Declared<"subscriptionError2", SubscriptionError> | Declared<"subscriptionError3", SubscriptionError> | Declared<"subscriptionError4", SubscriptionError> | Declared<"subscriptionError5", SubscriptionError> | Declared<"subscriptionError6", SubscriptionError>>;
        static readonly errors: ErrorDecoders<CreateSubscriptionError>;
    }
    type DeactivateBillingPlanRequest = {
        id: string;
    };
    class DeactivateBillingPlanError extends ApiError {
        readonly payload: ErrorPayload<Declared<"subscriptionError", SubscriptionError> | Declared<"subscriptionError2", SubscriptionError> | Declared<"subscriptionError3", SubscriptionError> | Declared<"subscriptionError4", SubscriptionError> | Declared<"subscriptionError5", SubscriptionError> | Declared<"subscriptionError6", SubscriptionError>>;
        static readonly errors: ErrorDecoders<DeactivateBillingPlanError>;
    }
    type GetBillingPlanRequest = {
        id: string;
    };
    class GetBillingPlanError extends ApiError {
        readonly payload: ErrorPayload<Declared<"subscriptionError", SubscriptionError> | Declared<"subscriptionError2", SubscriptionError> | Declared<"subscriptionError3", SubscriptionError> | Declared<"subscriptionError4", SubscriptionError> | Declared<"subscriptionError5", SubscriptionError>>;
        static readonly errors: ErrorDecoders<GetBillingPlanError>;
    }
    type GetSubscriptionRequest = {
        id: string;
        fields?: string;
    };
    class GetSubscriptionError extends ApiError {
        readonly payload: ErrorPayload<Declared<"subscriptionError", SubscriptionError> | Declared<"subscriptionError2", SubscriptionError> | Declared<"subscriptionError3", SubscriptionError> | Declared<"subscriptionError4", SubscriptionError> | Declared<"subscriptionError5", SubscriptionError>>;
        static readonly errors: ErrorDecoders<GetSubscriptionError>;
    }
    type ListBillingPlansRequest = {
        productId?: string;
        pageSize?: number;
        page?: number;
        totalRequired?: boolean;
        prefer?: string;
    };
    class ListBillingPlansError extends ApiError {
        readonly payload: ErrorPayload<Declared<"subscriptionError", SubscriptionError> | Declared<"subscriptionError2", SubscriptionError> | Declared<"subscriptionError3", SubscriptionError> | Declared<"subscriptionError4", SubscriptionError> | Declared<"subscriptionError5", SubscriptionError> | Declared<"subscriptionError6", SubscriptionError>>;
        static readonly errors: ErrorDecoders<ListBillingPlansError>;
    }
    type ListSubscriptionTransactionsRequest = {
        id: string;
        startTime: string;
        endTime: string;
    };
    class ListSubscriptionTransactionsError extends ApiError {
        readonly payload: ErrorPayload<Declared<"subscriptionError", SubscriptionError> | Declared<"subscriptionError2", SubscriptionError> | Declared<"subscriptionError3", SubscriptionError> | Declared<"subscriptionError4", SubscriptionError> | Declared<"subscriptionError5", SubscriptionError> | Declared<"subscriptionError6", SubscriptionError>>;
        static readonly errors: ErrorDecoders<ListSubscriptionTransactionsError>;
    }
    type ListSubscriptionsRequest = {
        planIds?: string;
        statuses?: string;
        createdAfter?: string;
        createdBefore?: string;
        statusUpdatedBefore?: string;
        statusUpdatedAfter?: string;
        filter?: string;
        pageSize?: number;
        page?: number;
        customerIds?: string[];
    };
    class ListSubscriptionsError extends ApiError {
        readonly payload: ErrorPayload<Declared<"subscriptionError", SubscriptionError> | Declared<"subscriptionError2", SubscriptionError> | Declared<"subscriptionError3", SubscriptionError> | Declared<"subscriptionError4", SubscriptionError> | Declared<"subscriptionError5", SubscriptionError>>;
        static readonly errors: ErrorDecoders<ListSubscriptionsError>;
    }
    type PatchBillingPlanRequest = {
        id: string;
        body?: Patch[];
    };
    class PatchBillingPlanError extends ApiError {
        readonly payload: ErrorPayload<Declared<"subscriptionError", SubscriptionError> | Declared<"subscriptionError2", SubscriptionError> | Declared<"subscriptionError3", SubscriptionError> | Declared<"subscriptionError4", SubscriptionError> | Declared<"subscriptionError5", SubscriptionError> | Declared<"subscriptionError6", SubscriptionError> | Declared<"subscriptionError7", SubscriptionError>>;
        static readonly errors: ErrorDecoders<PatchBillingPlanError>;
    }
    type PatchSubscriptionRequest = {
        id: string;
        body?: Patch[];
    };
    class PatchSubscriptionError extends ApiError {
        readonly payload: ErrorPayload<Declared<"subscriptionError", SubscriptionError> | Declared<"subscriptionError2", SubscriptionError> | Declared<"subscriptionError3", SubscriptionError> | Declared<"subscriptionError4", SubscriptionError> | Declared<"subscriptionError5", SubscriptionError> | Declared<"subscriptionError6", SubscriptionError> | Declared<"subscriptionError7", SubscriptionError>>;
        static readonly errors: ErrorDecoders<PatchSubscriptionError>;
    }
    type ReviseSubscriptionRequest = {
        id: string;
        body?: ModifySubscriptionRequest;
    };
    class ReviseSubscriptionError extends ApiError {
        readonly payload: ErrorPayload<Declared<"subscriptionError", SubscriptionError> | Declared<"subscriptionError2", SubscriptionError> | Declared<"subscriptionError3", SubscriptionError> | Declared<"subscriptionError4", SubscriptionError> | Declared<"subscriptionError5", SubscriptionError> | Declared<"subscriptionError6", SubscriptionError> | Declared<"subscriptionError7", SubscriptionError>>;
        static readonly errors: ErrorDecoders<ReviseSubscriptionError>;
    }
    type SuspendSubscriptionRequest = {
        id: string;
        body?: SuspendSubscription;
    };
    class SuspendSubscriptionError extends ApiError {
        readonly payload: ErrorPayload<Declared<"subscriptionError", SubscriptionError> | Declared<"subscriptionError2", SubscriptionError> | Declared<"subscriptionError3", SubscriptionError> | Declared<"subscriptionError4", SubscriptionError> | Declared<"subscriptionError5", SubscriptionError> | Declared<"subscriptionError6", SubscriptionError> | Declared<"subscriptionError7", SubscriptionError>>;
        static readonly errors: ErrorDecoders<SuspendSubscriptionError>;
    }
    type UpdateBillingPlanPricingSchemesRequest = {
        id: string;
        body?: UpdatePricingSchemesRequest;
    };
    class UpdateBillingPlanPricingSchemesError extends ApiError {
        readonly payload: ErrorPayload<Declared<"subscriptionError", SubscriptionError> | Declared<"subscriptionError2", SubscriptionError> | Declared<"subscriptionError3", SubscriptionError> | Declared<"subscriptionError4", SubscriptionError> | Declared<"subscriptionError5", SubscriptionError> | Declared<"subscriptionError6", SubscriptionError> | Declared<"subscriptionError7", SubscriptionError>>;
        static readonly errors: ErrorDecoders<UpdateBillingPlanPricingSchemesError>;
    }
}
