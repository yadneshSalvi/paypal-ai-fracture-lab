from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .billing_cycle import BillingCycle, BillingCycleDict
from .one_time_charge import OneTimeCharge, OneTimeChargeDict

class Plan(SdkBaseModel):
    billing_cycles: list[BillingCycle]
    one_time_charges: OneTimeCharge
    name: Optional[str] = UNSET

class PlanDict(TypedDict):
    billing_cycles: list[BillingCycleDict]
    one_time_charges: OneTimeChargeDict
    name: NotRequired[str]
