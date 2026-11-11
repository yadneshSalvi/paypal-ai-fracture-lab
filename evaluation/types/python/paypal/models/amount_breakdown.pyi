from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .money import Money, MoneyDict

class AmountBreakdown(SdkBaseModel):
    item_total: Optional[Money] = UNSET
    shipping: Optional[Money] = UNSET
    handling: Optional[Money] = UNSET
    tax_total: Optional[Money] = UNSET
    insurance: Optional[Money] = UNSET
    shipping_discount: Optional[Money] = UNSET
    discount: Optional[Money] = UNSET

class AmountBreakdownDict(TypedDict):
    item_total: NotRequired[MoneyDict]
    shipping: NotRequired[MoneyDict]
    handling: NotRequired[MoneyDict]
    tax_total: NotRequired[MoneyDict]
    insurance: NotRequired[MoneyDict]
    shipping_discount: NotRequired[MoneyDict]
    discount: NotRequired[MoneyDict]
