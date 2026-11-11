from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .enums.setup_fee_failure_action import SetupFeeFailureActionOrStr
from .money import Money, MoneyDict

class PaymentPreferencesOverride(SdkBaseModel):
    auto_bill_outstanding: Optional[bool] = UNSET
    setup_fee: Optional[Money] = UNSET
    setup_fee_failure_action: Optional[SetupFeeFailureActionOrStr] = UNSET
    payment_failure_threshold: Optional[int] = UNSET

class PaymentPreferencesOverrideDict(TypedDict):
    auto_bill_outstanding: NotRequired[bool]
    setup_fee: NotRequired[MoneyDict]
    setup_fee_failure_action: NotRequired[SetupFeeFailureActionOrStr]
    payment_failure_threshold: NotRequired[int]
