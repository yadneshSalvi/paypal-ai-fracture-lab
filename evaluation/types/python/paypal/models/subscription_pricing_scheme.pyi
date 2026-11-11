from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .enums.subscription_pricing_model import SubscriptionPricingModelOrStr
from .money import Money, MoneyDict
from .pricing_tier import PricingTier, PricingTierDict

class SubscriptionPricingScheme(SdkBaseModel):
    version: Optional[int] = UNSET
    fixed_price: Optional[Money] = UNSET
    pricing_model: Optional[SubscriptionPricingModelOrStr] = UNSET
    tiers: Optional[list[PricingTier]] = UNSET
    create_time: Optional[str] = UNSET
    update_time: Optional[str] = UNSET

class SubscriptionPricingSchemeDict(TypedDict):
    version: NotRequired[int]
    fixed_price: NotRequired[MoneyDict]
    pricing_model: NotRequired[SubscriptionPricingModelOrStr]
    tiers: NotRequired[list[PricingTierDict]]
    create_time: NotRequired[str]
    update_time: NotRequired[str]
