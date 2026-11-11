from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .enums.pricing_model import PricingModelOrStr
from .money import Money, MoneyDict

class PricingScheme(SdkBaseModel):
    price: Optional[Money] = UNSET
    pricing_model: PricingModelOrStr
    reload_threshold_amount: Optional[Money] = UNSET

class PricingSchemeDict(TypedDict):
    price: NotRequired[MoneyDict]
    pricing_model: PricingModelOrStr
    reload_threshold_amount: NotRequired[MoneyDict]
