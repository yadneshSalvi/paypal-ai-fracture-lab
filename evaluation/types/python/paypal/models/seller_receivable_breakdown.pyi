from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .exchange_rate import ExchangeRate, ExchangeRateDict
from .money import Money, MoneyDict
from .platform_fee import PlatformFee, PlatformFeeDict

class SellerReceivableBreakdown(SdkBaseModel):
    gross_amount: Money
    paypal_fee: Optional[Money] = UNSET
    paypal_fee_in_receivable_currency: Optional[Money] = UNSET
    net_amount: Optional[Money] = UNSET
    receivable_amount: Optional[Money] = UNSET
    exchange_rate: Optional[ExchangeRate] = UNSET
    platform_fees: Optional[list[PlatformFee]] = UNSET

class SellerReceivableBreakdownDict(TypedDict):
    gross_amount: MoneyDict
    paypal_fee: NotRequired[MoneyDict]
    paypal_fee_in_receivable_currency: NotRequired[MoneyDict]
    net_amount: NotRequired[MoneyDict]
    receivable_amount: NotRequired[MoneyDict]
    exchange_rate: NotRequired[ExchangeRateDict]
    platform_fees: NotRequired[list[PlatformFeeDict]]
