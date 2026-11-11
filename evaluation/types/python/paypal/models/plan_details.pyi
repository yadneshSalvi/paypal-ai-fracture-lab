from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .merchant_preferences import MerchantPreferences, MerchantPreferencesDict
from .payment_preferences import PaymentPreferences, PaymentPreferencesDict
from .subscription_billing_cycle import SubscriptionBillingCycle, SubscriptionBillingCycleDict
from .taxes import Taxes, TaxesDict

class PlanDetails(SdkBaseModel):
    product_id: Optional[str] = UNSET
    name: Optional[str] = UNSET
    description: Optional[str] = UNSET
    billing_cycles: Optional[list[SubscriptionBillingCycle]] = UNSET
    payment_preferences: Optional[PaymentPreferences] = UNSET
    merchant_preferences: Optional[MerchantPreferences] = UNSET
    taxes: Optional[Taxes] = UNSET
    quantity_supported: bool = False

class PlanDetailsDict(TypedDict):
    product_id: NotRequired[str]
    name: NotRequired[str]
    description: NotRequired[str]
    billing_cycles: NotRequired[list[SubscriptionBillingCycleDict]]
    payment_preferences: NotRequired[PaymentPreferencesDict]
    merchant_preferences: NotRequired[MerchantPreferencesDict]
    taxes: NotRequired[TaxesDict]
    quantity_supported: NotRequired[bool]
