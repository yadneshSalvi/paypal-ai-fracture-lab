from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .billing_cycle_override import BillingCycleOverride, BillingCycleOverrideDict
from .payment_preferences_override import PaymentPreferencesOverride, PaymentPreferencesOverrideDict
from .taxes_override import TaxesOverride, TaxesOverrideDict

class PlanOverride(SdkBaseModel):
    billing_cycles: Optional[list[BillingCycleOverride]] = UNSET
    payment_preferences: Optional[PaymentPreferencesOverride] = UNSET
    taxes: Optional[TaxesOverride] = UNSET

class PlanOverrideDict(TypedDict):
    billing_cycles: NotRequired[list[BillingCycleOverrideDict]]
    payment_preferences: NotRequired[PaymentPreferencesOverrideDict]
    taxes: NotRequired[TaxesOverrideDict]
