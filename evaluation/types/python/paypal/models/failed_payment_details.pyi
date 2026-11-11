from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .enums.reason_code import ReasonCodeOrStr
from .money import Money, MoneyDict

class FailedPaymentDetails(SdkBaseModel):
    amount: Money
    time: str
    reason_code: Optional[ReasonCodeOrStr] = UNSET
    next_payment_retry_time: Optional[str] = UNSET

class FailedPaymentDetailsDict(TypedDict):
    amount: MoneyDict
    time: str
    reason_code: NotRequired[ReasonCodeOrStr]
    next_payment_retry_time: NotRequired[str]
