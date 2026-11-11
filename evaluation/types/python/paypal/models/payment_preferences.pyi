from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .enums.setup_fee_failure_action import SetupFeeFailureAction, SetupFeeFailureActionOrStr
from .money import Money, MoneyDict

class PaymentPreferences(SdkBaseModel):
    auto_bill_outstanding: bool = True
    setup_fee: Optional[Money] = UNSET
    setup_fee_failure_action: SetupFeeFailureActionOrStr = SetupFeeFailureAction.CANCEL
    payment_failure_threshold: int = 0

class PaymentPreferencesDict(TypedDict):
    auto_bill_outstanding: NotRequired[bool]
    setup_fee: NotRequired[MoneyDict]
    setup_fee_failure_action: NotRequired[SetupFeeFailureActionOrStr]
    payment_failure_threshold: NotRequired[int]
