from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .money import Money, MoneyDict

class LastPaymentDetails(SdkBaseModel):
    amount: Optional[Money] = UNSET
    time: Optional[str] = UNSET

class LastPaymentDetailsDict(TypedDict):
    amount: NotRequired[MoneyDict]
    time: NotRequired[str]
