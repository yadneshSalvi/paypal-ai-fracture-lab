from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .money import Money, MoneyDict
from .payee_base import PayeeBase, PayeeBaseDict

class PlatformFee(SdkBaseModel):
    amount: Money
    payee: Optional[PayeeBase] = UNSET

class PlatformFeeDict(TypedDict):
    amount: MoneyDict
    payee: NotRequired[PayeeBaseDict]
