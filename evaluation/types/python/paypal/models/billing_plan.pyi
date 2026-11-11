from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .enums.subscription_plan_status import SubscriptionPlanStatusOrStr
from .link_description import LinkDescription, LinkDescriptionDict
from .merchant_preferences import MerchantPreferences, MerchantPreferencesDict
from .payment_preferences import PaymentPreferences, PaymentPreferencesDict
from .subscription_billing_cycle import SubscriptionBillingCycle, SubscriptionBillingCycleDict
from .taxes import Taxes, TaxesDict

class BillingPlan(SdkBaseModel):
    id: Optional[str] = UNSET
    product_id: Optional[str] = UNSET
    name: Optional[str] = UNSET
    status: Optional[SubscriptionPlanStatusOrStr] = UNSET
    description: Optional[str] = UNSET
    billing_cycles: Optional[list[SubscriptionBillingCycle]] = UNSET
    payment_preferences: Optional[PaymentPreferences] = UNSET
    merchant_preferences: Optional[MerchantPreferences] = UNSET
    taxes: Optional[Taxes] = UNSET
    quantity_supported: bool = False
    create_time: Optional[str] = UNSET
    update_time: Optional[str] = UNSET
    links: Optional[list[LinkDescription]] = UNSET

class BillingPlanDict(TypedDict):
    id: NotRequired[str]
    product_id: NotRequired[str]
    name: NotRequired[str]
    status: NotRequired[SubscriptionPlanStatusOrStr]
    description: NotRequired[str]
    billing_cycles: NotRequired[list[SubscriptionBillingCycleDict]]
    payment_preferences: NotRequired[PaymentPreferencesDict]
    merchant_preferences: NotRequired[MerchantPreferencesDict]
    taxes: NotRequired[TaxesDict]
    quantity_supported: NotRequired[bool]
    create_time: NotRequired[str]
    update_time: NotRequired[str]
    links: NotRequired[list[LinkDescriptionDict]]
