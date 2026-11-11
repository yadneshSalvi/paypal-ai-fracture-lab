from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .money import Money, MoneyDict

class PricingTier(SdkBaseModel):
    starting_quantity: str
    ending_quantity: Optional[str] = UNSET
    amount: Money

class PricingTierDict(TypedDict):
    starting_quantity: str
    ending_quantity: NotRequired[str]
    amount: MoneyDict
