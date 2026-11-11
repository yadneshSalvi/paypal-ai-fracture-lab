from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .money import Money, MoneyDict

class OneTimeCharge(SdkBaseModel):
    setup_fee: Optional[Money] = UNSET
    shipping_amount: Optional[Money] = UNSET
    taxes: Optional[Money] = UNSET
    product_price: Optional[Money] = UNSET
    subtotal: Optional[Money] = UNSET
    total_amount: Money

class OneTimeChargeDict(TypedDict):
    setup_fee: NotRequired[MoneyDict]
    shipping_amount: NotRequired[MoneyDict]
    taxes: NotRequired[MoneyDict]
    product_price: NotRequired[MoneyDict]
    subtotal: NotRequired[MoneyDict]
    total_amount: MoneyDict
