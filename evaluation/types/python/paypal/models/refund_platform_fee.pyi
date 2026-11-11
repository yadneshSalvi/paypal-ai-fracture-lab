from __future__ import annotations
from typing_extensions import TypedDict
from ..core import SdkBaseModel
from .money import Money, MoneyDict

class RefundPlatformFee(SdkBaseModel):
    amount: Money

class RefundPlatformFeeDict(TypedDict):
    amount: MoneyDict
