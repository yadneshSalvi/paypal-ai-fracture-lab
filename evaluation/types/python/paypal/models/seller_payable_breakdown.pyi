from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .money import Money, MoneyDict
from .net_amount_breakdown_item import NetAmountBreakdownItem, NetAmountBreakdownItemDict
from .platform_fee import PlatformFee, PlatformFeeDict

class SellerPayableBreakdown(SdkBaseModel):
    gross_amount: Optional[Money] = UNSET
    paypal_fee: Optional[Money] = UNSET
    paypal_fee_in_receivable_currency: Optional[Money] = UNSET
    net_amount: Optional[Money] = UNSET
    net_amount_in_receivable_currency: Optional[Money] = UNSET
    platform_fees: Optional[list[PlatformFee]] = UNSET
    net_amount_breakdown: Optional[list[NetAmountBreakdownItem]] = UNSET
    total_refunded_amount: Optional[Money] = UNSET

class SellerPayableBreakdownDict(TypedDict):
    gross_amount: NotRequired[MoneyDict]
    paypal_fee: NotRequired[MoneyDict]
    paypal_fee_in_receivable_currency: NotRequired[MoneyDict]
    net_amount: NotRequired[MoneyDict]
    net_amount_in_receivable_currency: NotRequired[MoneyDict]
    platform_fees: NotRequired[list[PlatformFeeDict]]
    net_amount_breakdown: NotRequired[list[NetAmountBreakdownItemDict]]
    total_refunded_amount: NotRequired[MoneyDict]
