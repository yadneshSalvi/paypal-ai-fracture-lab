from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .apple_pay_request_card import ApplePayRequestCard, ApplePayRequestCardDict

class VaultApplePayRequest(SdkBaseModel):
    token: Optional[str] = UNSET
    card: Optional[ApplePayRequestCard] = UNSET

class VaultApplePayRequestDict(TypedDict):
    token: NotRequired[str]
    card: NotRequired[ApplePayRequestCardDict]
