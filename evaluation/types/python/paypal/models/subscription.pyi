from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .link_description import LinkDescription, LinkDescriptionDict
from .money import Money, MoneyDict
from .plan_details import PlanDetails, PlanDetailsDict
from .subscriber import Subscriber, SubscriberDict
from .subscription_billing_information import SubscriptionBillingInformation, SubscriptionBillingInformationDict

class Subscription(SdkBaseModel):
    id: Optional[str] = UNSET
    plan_id: Optional[str] = UNSET
    start_time: Optional[str] = UNSET
    quantity: Optional[str] = UNSET
    shipping_amount: Optional[Money] = UNSET
    subscriber: Optional[Subscriber] = UNSET
    billing_info: Optional[SubscriptionBillingInformation] = UNSET
    create_time: Optional[str] = UNSET
    update_time: Optional[str] = UNSET
    custom_id: Optional[str] = UNSET
    plan_overridden: Optional[bool] = UNSET
    plan: Optional[PlanDetails] = UNSET
    links: Optional[list[LinkDescription]] = UNSET

class SubscriptionDict(TypedDict):
    id: NotRequired[str]
    plan_id: NotRequired[str]
    start_time: NotRequired[str]
    quantity: NotRequired[str]
    shipping_amount: NotRequired[MoneyDict]
    subscriber: NotRequired[SubscriberDict]
    billing_info: NotRequired[SubscriptionBillingInformationDict]
    create_time: NotRequired[str]
    update_time: NotRequired[str]
    custom_id: NotRequired[str]
    plan_overridden: NotRequired[bool]
    plan: NotRequired[PlanDetailsDict]
    links: NotRequired[list[LinkDescriptionDict]]
