from __future__ import annotations
from typing_extensions import TypedDict
from ..core import SdkBaseModel
from .enums.capture_type import CaptureTypeOrStr
from .money import Money, MoneyDict

class CaptureSubscriptionRequest(SdkBaseModel):
    note: str
    capture_type: CaptureTypeOrStr
    amount: Money

class CaptureSubscriptionRequestDict(TypedDict):
    note: str
    capture_type: CaptureTypeOrStr
    amount: MoneyDict
