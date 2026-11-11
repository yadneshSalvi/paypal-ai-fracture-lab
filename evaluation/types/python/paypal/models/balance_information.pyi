from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .money import Money, MoneyDict

class BalanceInformation(SdkBaseModel):
    currency: str
    primary: Optional[bool] = UNSET
    total_balance: Money
    available_balance: Optional[Money] = UNSET
    withheld_balance: Optional[Money] = UNSET

class BalanceInformationDict(TypedDict):
    currency: str
    primary: NotRequired[bool]
    total_balance: MoneyDict
    available_balance: NotRequired[MoneyDict]
    withheld_balance: NotRequired[MoneyDict]
