from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel

class ApplePayPaymentData(SdkBaseModel):
    cryptogram: Optional[str] = UNSET
    eci_indicator: Optional[str] = UNSET
    emv_data: Optional[str] = UNSET
    pin: Optional[str] = UNSET

class ApplePayPaymentDataDict(TypedDict):
    cryptogram: NotRequired[str]
    eci_indicator: NotRequired[str]
    emv_data: NotRequired[str]
    pin: NotRequired[str]
