from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .exchange_rate import ExchangeRate, ExchangeRateDict
from .money import Money, MoneyDict

class NetAmountBreakdownItem(SdkBaseModel):
    payable_amount: Optional[Money] = UNSET
    converted_amount: Optional[Money] = UNSET
    exchange_rate: Optional[ExchangeRate] = UNSET

class NetAmountBreakdownItemDict(TypedDict):
    payable_amount: NotRequired[MoneyDict]
    converted_amount: NotRequired[MoneyDict]
    exchange_rate: NotRequired[ExchangeRateDict]
