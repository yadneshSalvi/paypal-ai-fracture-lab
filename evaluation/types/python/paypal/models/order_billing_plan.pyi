from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .billing_cycle import BillingCycle, BillingCycleDict
from .money import Money, MoneyDict

class OrderBillingPlan(SdkBaseModel):
    billing_cycles: list[BillingCycle]
    setup_fee: Optional[Money] = UNSET
    name: Optional[str] = UNSET

class OrderBillingPlanDict(TypedDict):
    billing_cycles: list[BillingCycleDict]
    setup_fee: NotRequired[MoneyDict]
    name: NotRequired[str]
