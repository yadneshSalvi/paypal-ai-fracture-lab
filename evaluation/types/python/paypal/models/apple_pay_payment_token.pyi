from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .apple_pay_card import ApplePayCard, ApplePayCardDict

class ApplePayPaymentToken(SdkBaseModel):
    card: Optional[ApplePayCard] = UNSET

class ApplePayPaymentTokenDict(TypedDict):
    card: NotRequired[ApplePayCardDict]
