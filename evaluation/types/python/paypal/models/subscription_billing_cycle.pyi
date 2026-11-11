from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .enums.tenure_type import TenureTypeOrStr
from .frequency import Frequency, FrequencyDict
from .subscription_pricing_scheme import SubscriptionPricingScheme, SubscriptionPricingSchemeDict

class SubscriptionBillingCycle(SdkBaseModel):
    pricing_scheme: Optional[SubscriptionPricingScheme] = UNSET
    frequency: Frequency
    tenure_type: TenureTypeOrStr
    sequence: int
    total_cycles: int = 1

class SubscriptionBillingCycleDict(TypedDict):
    pricing_scheme: NotRequired[SubscriptionPricingSchemeDict]
    frequency: FrequencyDict
    tenure_type: TenureTypeOrStr
    sequence: int
    total_cycles: NotRequired[int]
