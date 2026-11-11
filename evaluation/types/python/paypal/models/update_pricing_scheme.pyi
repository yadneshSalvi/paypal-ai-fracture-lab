from __future__ import annotations
from typing_extensions import TypedDict
from ..core import SdkBaseModel
from .subscription_pricing_scheme import SubscriptionPricingScheme, SubscriptionPricingSchemeDict

class UpdatePricingScheme(SdkBaseModel):
    billing_cycle_sequence: int
    pricing_scheme: SubscriptionPricingScheme

class UpdatePricingSchemeDict(TypedDict):
    billing_cycle_sequence: int
    pricing_scheme: SubscriptionPricingSchemeDict
