from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .money import Money, MoneyDict

class SubscriptionAmountWithBreakdown(SdkBaseModel):
    gross_amount: Money
    total_item_amount: Optional[Money] = UNSET
    fee_amount: Optional[Money] = UNSET
    shipping_amount: Optional[Money] = UNSET
    tax_amount: Optional[Money] = UNSET
    net_amount: Optional[Money] = UNSET

class SubscriptionAmountWithBreakdownDict(TypedDict):
    gross_amount: MoneyDict
    total_item_amount: NotRequired[MoneyDict]
    fee_amount: NotRequired[MoneyDict]
    shipping_amount: NotRequired[MoneyDict]
    tax_amount: NotRequired[MoneyDict]
    net_amount: NotRequired[MoneyDict]
