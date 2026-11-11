from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .enums.tenure_type import TenureTypeOrStr
from .pricing_scheme import PricingScheme, PricingSchemeDict

class BillingCycle(SdkBaseModel):
    tenure_type: TenureTypeOrStr
    pricing_scheme: Optional[PricingScheme] = UNSET
    total_cycles: int = 1
    sequence: int = 1
    start_date: Optional[str] = UNSET

class BillingCycleDict(TypedDict):
    tenure_type: TenureTypeOrStr
    pricing_scheme: NotRequired[PricingSchemeDict]
    total_cycles: NotRequired[int]
    sequence: NotRequired[int]
    start_date: NotRequired[str]
