from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .money import Money, MoneyDict
from .plan_override import PlanOverride, PlanOverrideDict
from .subscriber_request import SubscriberRequest, SubscriberRequestDict
from .subscription_application_context import SubscriptionApplicationContext, SubscriptionApplicationContextDict

class CreateSubscriptionRequest(SdkBaseModel):
    plan_id: str
    start_time: Optional[str] = UNSET
    quantity: Optional[str] = UNSET
    shipping_amount: Optional[Money] = UNSET
    subscriber: Optional[SubscriberRequest] = UNSET
    auto_renewal: bool = False
    application_context: Optional[SubscriptionApplicationContext] = UNSET
    custom_id: Optional[str] = UNSET
    plan: Optional[PlanOverride] = UNSET

class CreateSubscriptionRequestDict(TypedDict):
    plan_id: str
    start_time: NotRequired[str]
    quantity: NotRequired[str]
    shipping_amount: NotRequired[MoneyDict]
    subscriber: NotRequired[SubscriberRequestDict]
    auto_renewal: NotRequired[bool]
    application_context: NotRequired[SubscriptionApplicationContextDict]
    custom_id: NotRequired[str]
    plan: NotRequired[PlanOverrideDict]
