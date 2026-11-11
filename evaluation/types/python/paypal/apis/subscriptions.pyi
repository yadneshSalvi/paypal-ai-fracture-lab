from __future__ import annotations
from uuid import UUID, uuid4
from ..auth import AsyncAuthSchemes, AuthSchemes
from ..core import ApiResult, AsyncRawClient, RawClient, RequestOptionsOrDict, SecuredRawResponse, async_empty_response, async_json_decoder, empty_response, json_body, json_decoder, param, unwrap
from ..errors.activate_billing_plan_error import ActivateBillingPlanErrorBody, activate_billing_plan_error_mapper
from ..errors.activate_subscription_error import ActivateSubscriptionErrorBody, activate_subscription_error_mapper
from ..errors.cancel_subscription_error import CancelSubscriptionErrorBody, cancel_subscription_error_mapper
from ..errors.capture_subscription_error import CaptureSubscriptionErrorBody, capture_subscription_error_mapper
from ..errors.create_billing_plan_error import CreateBillingPlanErrorBody, create_billing_plan_error_mapper
from ..errors.create_subscription_error import CreateSubscriptionErrorBody, create_subscription_error_mapper
from ..errors.deactivate_billing_plan_error import DeactivateBillingPlanErrorBody, deactivate_billing_plan_error_mapper
from ..errors.get_billing_plan_error import GetBillingPlanErrorBody, get_billing_plan_error_mapper
from ..errors.get_subscription_error import GetSubscriptionErrorBody, get_subscription_error_mapper
from ..errors.list_billing_plans_error import ListBillingPlansErrorBody, list_billing_plans_error_mapper
from ..errors.list_subscription_transactions_error import ListSubscriptionTransactionsErrorBody, list_subscription_transactions_error_mapper
from ..errors.list_subscriptions_error import ListSubscriptionsErrorBody, list_subscriptions_error_mapper
from ..errors.patch_billing_plan_error import PatchBillingPlanErrorBody, patch_billing_plan_error_mapper
from ..errors.patch_subscription_error import PatchSubscriptionErrorBody, patch_subscription_error_mapper
from ..errors.revise_subscription_error import ReviseSubscriptionErrorBody, revise_subscription_error_mapper
from ..errors.suspend_subscription_error import SuspendSubscriptionErrorBody, suspend_subscription_error_mapper
from ..errors.update_billing_plan_pricing_schemes_error import UpdateBillingPlanPricingSchemesErrorBody, update_billing_plan_pricing_schemes_error_mapper
from ..models.activate_subscription_request import ActivateSubscriptionRequest, ActivateSubscriptionRequestDict
from ..models.billing_plan import BillingPlan
from ..models.cancel_subscription_request import CancelSubscriptionRequest, CancelSubscriptionRequestDict
from ..models.capture_subscription_request import CaptureSubscriptionRequest, CaptureSubscriptionRequestDict
from ..models.create_subscription_request import CreateSubscriptionRequest, CreateSubscriptionRequestDict
from ..models.modify_subscription_request import ModifySubscriptionRequest, ModifySubscriptionRequestDict
from ..models.modify_subscription_response import ModifySubscriptionResponse
from ..models.patch import Patch, PatchDict
from ..models.plan_collection import PlanCollection
from ..models.plan_request import PlanRequest, PlanRequestDict
from ..models.subscription import Subscription
from ..models.subscription_collection import SubscriptionCollection
from ..models.subscription_transaction_details import SubscriptionTransactionDetails
from ..models.suspend_subscription import SuspendSubscription, SuspendSubscriptionDict
from ..models.transactions_list import TransactionsList
from ..models.update_pricing_schemes_request import UpdatePricingSchemesRequest, UpdatePricingSchemesRequestDict
from ..server.server import Server

class Subscriptions:

    def __init__(self, client: RawClient, server: Server, auth: AuthSchemes) -> None:
        ...

    def activate_billing_plan(self, id_: str, *, request_options: RequestOptionsOrDict | None=None) -> None:
        ...

    def activate_subscription(self, id_: str, *, body: ActivateSubscriptionRequest | ActivateSubscriptionRequestDict | None=None, request_options: RequestOptionsOrDict | None=None) -> None:
        ...

    def cancel_subscription(self, id_: str, *, body: CancelSubscriptionRequest | CancelSubscriptionRequestDict | None=None, request_options: RequestOptionsOrDict | None=None) -> None:
        ...

    def capture_subscription(self, id_: str, *, pay_pal_request_id: str | None=None, body: CaptureSubscriptionRequest | CaptureSubscriptionRequestDict | None=None, request_options: RequestOptionsOrDict | None=None) -> SubscriptionTransactionDetails:
        ...

    def create_billing_plan(self, *, prefer: str | None='return=minimal', pay_pal_request_id: str | None=None, body: PlanRequest | PlanRequestDict | None=None, request_options: RequestOptionsOrDict | None=None) -> BillingPlan:
        ...

    def create_subscription(self, *, prefer: str | None='return=minimal', pay_pal_request_id: str | None=None, pay_pal_client_metadata_id: str | None=None, body: CreateSubscriptionRequest | CreateSubscriptionRequestDict | None=None, request_options: RequestOptionsOrDict | None=None) -> Subscription:
        ...

    def deactivate_billing_plan(self, id_: str, *, request_options: RequestOptionsOrDict | None=None) -> None:
        ...

    def get_billing_plan(self, id_: str, *, request_options: RequestOptionsOrDict | None=None) -> BillingPlan:
        ...

    def get_subscription(self, id_: str, *, fields: str | None=None, request_options: RequestOptionsOrDict | None=None) -> Subscription:
        ...

    def list_billing_plans(self, *, product_id: str | None=None, page_size: int | None=10, page: int | None=1, total_required: bool | None=False, prefer: str | None='return=minimal', request_options: RequestOptionsOrDict | None=None) -> PlanCollection:
        ...

    def list_subscription_transactions(self, id_: str, start_time: str, end_time: str, *, request_options: RequestOptionsOrDict | None=None) -> TransactionsList:
        ...

    def list_subscriptions(self, *, plan_ids: str | None=None, statuses: str | None=None, created_after: str | None=None, created_before: str | None=None, status_updated_before: str | None=None, status_updated_after: str | None=None, filter_: str | None=None, page_size: int | None=10, page: int | None=1, customer_ids: list[str] | None=None, request_options: RequestOptionsOrDict | None=None) -> SubscriptionCollection:
        ...

    def patch_billing_plan(self, id_: str, *, body: list[Patch | PatchDict] | None=None, request_options: RequestOptionsOrDict | None=None) -> None:
        ...

    def patch_subscription(self, id_: str, *, body: list[Patch | PatchDict] | None=None, request_options: RequestOptionsOrDict | None=None) -> None:
        ...

    def revise_subscription(self, id_: str, *, body: ModifySubscriptionRequest | ModifySubscriptionRequestDict | None=None, request_options: RequestOptionsOrDict | None=None) -> ModifySubscriptionResponse:
        ...

    def suspend_subscription(self, id_: str, *, body: SuspendSubscription | SuspendSubscriptionDict | None=None, request_options: RequestOptionsOrDict | None=None) -> None:
        ...

    def update_billing_plan_pricing_schemes(self, id_: str, *, body: UpdatePricingSchemesRequest | UpdatePricingSchemesRequestDict | None=None, request_options: RequestOptionsOrDict | None=None) -> None:
        ...

    @property
    def with_raw_response(self) -> SubscriptionsWithRawResponse:
        ...

class AsyncSubscriptions:

    def __init__(self, client: AsyncRawClient, server: Server, auth: AsyncAuthSchemes) -> None:
        ...

    async def activate_billing_plan(self, id_: str, *, request_options: RequestOptionsOrDict | None=None) -> None:
        ...

    async def activate_subscription(self, id_: str, *, body: ActivateSubscriptionRequest | ActivateSubscriptionRequestDict | None=None, request_options: RequestOptionsOrDict | None=None) -> None:
        ...

    async def cancel_subscription(self, id_: str, *, body: CancelSubscriptionRequest | CancelSubscriptionRequestDict | None=None, request_options: RequestOptionsOrDict | None=None) -> None:
        ...

    async def capture_subscription(self, id_: str, *, pay_pal_request_id: str | None=None, body: CaptureSubscriptionRequest | CaptureSubscriptionRequestDict | None=None, request_options: RequestOptionsOrDict | None=None) -> SubscriptionTransactionDetails:
        ...

    async def create_billing_plan(self, *, prefer: str | None='return=minimal', pay_pal_request_id: str | None=None, body: PlanRequest | PlanRequestDict | None=None, request_options: RequestOptionsOrDict | None=None) -> BillingPlan:
        ...

    async def create_subscription(self, *, prefer: str | None='return=minimal', pay_pal_request_id: str | None=None, pay_pal_client_metadata_id: str | None=None, body: CreateSubscriptionRequest | CreateSubscriptionRequestDict | None=None, request_options: RequestOptionsOrDict | None=None) -> Subscription:
        ...

    async def deactivate_billing_plan(self, id_: str, *, request_options: RequestOptionsOrDict | None=None) -> None:
        ...

    async def get_billing_plan(self, id_: str, *, request_options: RequestOptionsOrDict | None=None) -> BillingPlan:
        ...

    async def get_subscription(self, id_: str, *, fields: str | None=None, request_options: RequestOptionsOrDict | None=None) -> Subscription:
        ...

    async def list_billing_plans(self, *, product_id: str | None=None, page_size: int | None=10, page: int | None=1, total_required: bool | None=False, prefer: str | None='return=minimal', request_options: RequestOptionsOrDict | None=None) -> PlanCollection:
        ...

    async def list_subscription_transactions(self, id_: str, start_time: str, end_time: str, *, request_options: RequestOptionsOrDict | None=None) -> TransactionsList:
        ...

    async def list_subscriptions(self, *, plan_ids: str | None=None, statuses: str | None=None, created_after: str | None=None, created_before: str | None=None, status_updated_before: str | None=None, status_updated_after: str | None=None, filter_: str | None=None, page_size: int | None=10, page: int | None=1, customer_ids: list[str] | None=None, request_options: RequestOptionsOrDict | None=None) -> SubscriptionCollection:
        ...

    async def patch_billing_plan(self, id_: str, *, body: list[Patch | PatchDict] | None=None, request_options: RequestOptionsOrDict | None=None) -> None:
        ...

    async def patch_subscription(self, id_: str, *, body: list[Patch | PatchDict] | None=None, request_options: RequestOptionsOrDict | None=None) -> None:
        ...

    async def revise_subscription(self, id_: str, *, body: ModifySubscriptionRequest | ModifySubscriptionRequestDict | None=None, request_options: RequestOptionsOrDict | None=None) -> ModifySubscriptionResponse:
        ...

    async def suspend_subscription(self, id_: str, *, body: SuspendSubscription | SuspendSubscriptionDict | None=None, request_options: RequestOptionsOrDict | None=None) -> None:
        ...

    async def update_billing_plan_pricing_schemes(self, id_: str, *, body: UpdatePricingSchemesRequest | UpdatePricingSchemesRequestDict | None=None, request_options: RequestOptionsOrDict | None=None) -> None:
        ...

    @property
    def with_raw_response(self) -> AsyncSubscriptionsWithRawResponse:
        ...

class SubscriptionsWithRawResponse(SecuredRawResponse[RawClient, Server, AuthSchemes]):

    def activate_billing_plan(self, id_: str, *, request_options: RequestOptionsOrDict | None=None) -> ApiResult[None, ActivateBillingPlanErrorBody]:
        ...

    def activate_subscription(self, id_: str, *, body: ActivateSubscriptionRequest | ActivateSubscriptionRequestDict | None=None, request_options: RequestOptionsOrDict | None=None) -> ApiResult[None, ActivateSubscriptionErrorBody]:
        ...

    def cancel_subscription(self, id_: str, *, body: CancelSubscriptionRequest | CancelSubscriptionRequestDict | None=None, request_options: RequestOptionsOrDict | None=None) -> ApiResult[None, CancelSubscriptionErrorBody]:
        ...

    def capture_subscription(self, id_: str, *, pay_pal_request_id: str | None=None, body: CaptureSubscriptionRequest | CaptureSubscriptionRequestDict | None=None, request_options: RequestOptionsOrDict | None=None) -> ApiResult[SubscriptionTransactionDetails, CaptureSubscriptionErrorBody]:
        ...

    def create_billing_plan(self, *, prefer: str | None='return=minimal', pay_pal_request_id: str | None=None, body: PlanRequest | PlanRequestDict | None=None, request_options: RequestOptionsOrDict | None=None) -> ApiResult[BillingPlan, CreateBillingPlanErrorBody]:
        ...

    def create_subscription(self, *, prefer: str | None='return=minimal', pay_pal_request_id: str | None=None, pay_pal_client_metadata_id: str | None=None, body: CreateSubscriptionRequest | CreateSubscriptionRequestDict | None=None, request_options: RequestOptionsOrDict | None=None) -> ApiResult[Subscription, CreateSubscriptionErrorBody]:
        ...

    def deactivate_billing_plan(self, id_: str, *, request_options: RequestOptionsOrDict | None=None) -> ApiResult[None, DeactivateBillingPlanErrorBody]:
        ...

    def get_billing_plan(self, id_: str, *, request_options: RequestOptionsOrDict | None=None) -> ApiResult[BillingPlan, GetBillingPlanErrorBody]:
        ...

    def get_subscription(self, id_: str, *, fields: str | None=None, request_options: RequestOptionsOrDict | None=None) -> ApiResult[Subscription, GetSubscriptionErrorBody]:
        ...

    def list_billing_plans(self, *, product_id: str | None=None, page_size: int | None=10, page: int | None=1, total_required: bool | None=False, prefer: str | None='return=minimal', request_options: RequestOptionsOrDict | None=None) -> ApiResult[PlanCollection, ListBillingPlansErrorBody]:
        ...

    def list_subscription_transactions(self, id_: str, start_time: str, end_time: str, *, request_options: RequestOptionsOrDict | None=None) -> ApiResult[TransactionsList, ListSubscriptionTransactionsErrorBody]:
        ...

    def list_subscriptions(self, *, plan_ids: str | None=None, statuses: str | None=None, created_after: str | None=None, created_before: str | None=None, status_updated_before: str | None=None, status_updated_after: str | None=None, filter_: str | None=None, page_size: int | None=10, page: int | None=1, customer_ids: list[str] | None=None, request_options: RequestOptionsOrDict | None=None) -> ApiResult[SubscriptionCollection, ListSubscriptionsErrorBody]:
        ...

    def patch_billing_plan(self, id_: str, *, body: list[Patch | PatchDict] | None=None, request_options: RequestOptionsOrDict | None=None) -> ApiResult[None, PatchBillingPlanErrorBody]:
        ...

    def patch_subscription(self, id_: str, *, body: list[Patch | PatchDict] | None=None, request_options: RequestOptionsOrDict | None=None) -> ApiResult[None, PatchSubscriptionErrorBody]:
        ...

    def revise_subscription(self, id_: str, *, body: ModifySubscriptionRequest | ModifySubscriptionRequestDict | None=None, request_options: RequestOptionsOrDict | None=None) -> ApiResult[ModifySubscriptionResponse, ReviseSubscriptionErrorBody]:
        ...

    def suspend_subscription(self, id_: str, *, body: SuspendSubscription | SuspendSubscriptionDict | None=None, request_options: RequestOptionsOrDict | None=None) -> ApiResult[None, SuspendSubscriptionErrorBody]:
        ...

    def update_billing_plan_pricing_schemes(self, id_: str, *, body: UpdatePricingSchemesRequest | UpdatePricingSchemesRequestDict | None=None, request_options: RequestOptionsOrDict | None=None) -> ApiResult[None, UpdateBillingPlanPricingSchemesErrorBody]:
        ...

class AsyncSubscriptionsWithRawResponse(SecuredRawResponse[AsyncRawClient, Server, AsyncAuthSchemes]):

    async def activate_billing_plan(self, id_: str, *, request_options: RequestOptionsOrDict | None=None) -> ApiResult[None, ActivateBillingPlanErrorBody]:
        ...

    async def activate_subscription(self, id_: str, *, body: ActivateSubscriptionRequest | ActivateSubscriptionRequestDict | None=None, request_options: RequestOptionsOrDict | None=None) -> ApiResult[None, ActivateSubscriptionErrorBody]:
        ...

    async def cancel_subscription(self, id_: str, *, body: CancelSubscriptionRequest | CancelSubscriptionRequestDict | None=None, request_options: RequestOptionsOrDict | None=None) -> ApiResult[None, CancelSubscriptionErrorBody]:
        ...

    async def capture_subscription(self, id_: str, *, pay_pal_request_id: str | None=None, body: CaptureSubscriptionRequest | CaptureSubscriptionRequestDict | None=None, request_options: RequestOptionsOrDict | None=None) -> ApiResult[SubscriptionTransactionDetails, CaptureSubscriptionErrorBody]:
        ...

    async def create_billing_plan(self, *, prefer: str | None='return=minimal', pay_pal_request_id: str | None=None, body: PlanRequest | PlanRequestDict | None=None, request_options: RequestOptionsOrDict | None=None) -> ApiResult[BillingPlan, CreateBillingPlanErrorBody]:
        ...

    async def create_subscription(self, *, prefer: str | None='return=minimal', pay_pal_request_id: str | None=None, pay_pal_client_metadata_id: str | None=None, body: CreateSubscriptionRequest | CreateSubscriptionRequestDict | None=None, request_options: RequestOptionsOrDict | None=None) -> ApiResult[Subscription, CreateSubscriptionErrorBody]:
        ...

    async def deactivate_billing_plan(self, id_: str, *, request_options: RequestOptionsOrDict | None=None) -> ApiResult[None, DeactivateBillingPlanErrorBody]:
        ...

    async def get_billing_plan(self, id_: str, *, request_options: RequestOptionsOrDict | None=None) -> ApiResult[BillingPlan, GetBillingPlanErrorBody]:
        ...

    async def get_subscription(self, id_: str, *, fields: str | None=None, request_options: RequestOptionsOrDict | None=None) -> ApiResult[Subscription, GetSubscriptionErrorBody]:
        ...

    async def list_billing_plans(self, *, product_id: str | None=None, page_size: int | None=10, page: int | None=1, total_required: bool | None=False, prefer: str | None='return=minimal', request_options: RequestOptionsOrDict | None=None) -> ApiResult[PlanCollection, ListBillingPlansErrorBody]:
        ...

    async def list_subscription_transactions(self, id_: str, start_time: str, end_time: str, *, request_options: RequestOptionsOrDict | None=None) -> ApiResult[TransactionsList, ListSubscriptionTransactionsErrorBody]:
        ...

    async def list_subscriptions(self, *, plan_ids: str | None=None, statuses: str | None=None, created_after: str | None=None, created_before: str | None=None, status_updated_before: str | None=None, status_updated_after: str | None=None, filter_: str | None=None, page_size: int | None=10, page: int | None=1, customer_ids: list[str] | None=None, request_options: RequestOptionsOrDict | None=None) -> ApiResult[SubscriptionCollection, ListSubscriptionsErrorBody]:
        ...

    async def patch_billing_plan(self, id_: str, *, body: list[Patch | PatchDict] | None=None, request_options: RequestOptionsOrDict | None=None) -> ApiResult[None, PatchBillingPlanErrorBody]:
        ...

    async def patch_subscription(self, id_: str, *, body: list[Patch | PatchDict] | None=None, request_options: RequestOptionsOrDict | None=None) -> ApiResult[None, PatchSubscriptionErrorBody]:
        ...

    async def revise_subscription(self, id_: str, *, body: ModifySubscriptionRequest | ModifySubscriptionRequestDict | None=None, request_options: RequestOptionsOrDict | None=None) -> ApiResult[ModifySubscriptionResponse, ReviseSubscriptionErrorBody]:
        ...

    async def suspend_subscription(self, id_: str, *, body: SuspendSubscription | SuspendSubscriptionDict | None=None, request_options: RequestOptionsOrDict | None=None) -> ApiResult[None, SuspendSubscriptionErrorBody]:
        ...

    async def update_billing_plan_pricing_schemes(self, id_: str, *, body: UpdatePricingSchemesRequest | UpdatePricingSchemesRequestDict | None=None, request_options: RequestOptionsOrDict | None=None) -> ApiResult[None, UpdateBillingPlanPricingSchemesErrorBody]:
        ...
