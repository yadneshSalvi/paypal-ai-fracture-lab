from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .enums.plan_request_status import PlanRequestStatus, PlanRequestStatusOrStr
from .merchant_preferences import MerchantPreferences, MerchantPreferencesDict
from .payment_preferences import PaymentPreferences, PaymentPreferencesDict
from .subscription_billing_cycle import SubscriptionBillingCycle, SubscriptionBillingCycleDict
from .taxes import Taxes, TaxesDict

class PlanRequest(SdkBaseModel):
    product_id: str
    name: str
    status: PlanRequestStatusOrStr = PlanRequestStatus.ACTIVE
    description: Optional[str] = UNSET
    billing_cycles: list[SubscriptionBillingCycle]
    payment_preferences: PaymentPreferences
    merchant_preferences: Optional[MerchantPreferences] = UNSET
    taxes: Optional[Taxes] = UNSET
    quantity_supported: bool = False

class PlanRequestDict(TypedDict):
    product_id: str
    name: str
    status: NotRequired[PlanRequestStatusOrStr]
    description: NotRequired[str]
    billing_cycles: list[SubscriptionBillingCycleDict]
    payment_preferences: PaymentPreferencesDict
    merchant_preferences: NotRequired[MerchantPreferencesDict]
    taxes: NotRequired[TaxesDict]
    quantity_supported: NotRequired[bool]
