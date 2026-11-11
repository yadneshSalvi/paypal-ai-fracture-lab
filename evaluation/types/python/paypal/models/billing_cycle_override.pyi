from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .subscription_pricing_scheme import SubscriptionPricingScheme, SubscriptionPricingSchemeDict

class BillingCycleOverride(SdkBaseModel):
    pricing_scheme: Optional[SubscriptionPricingScheme] = UNSET
    sequence: int
    total_cycles: Optional[int] = UNSET

class BillingCycleOverrideDict(TypedDict):
    pricing_scheme: NotRequired[SubscriptionPricingSchemeDict]
    sequence: int
    total_cycles: NotRequired[int]
