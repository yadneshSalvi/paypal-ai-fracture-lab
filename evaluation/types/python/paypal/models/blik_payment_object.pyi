from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .blik_one_click_payment_object import BlikOneClickPaymentObject, BlikOneClickPaymentObjectDict

class BlikPaymentObject(SdkBaseModel):
    name: Optional[str] = UNSET
    country_code: Optional[str] = UNSET
    email: Optional[str] = UNSET
    one_click: Optional[BlikOneClickPaymentObject] = UNSET

class BlikPaymentObjectDict(TypedDict):
    name: NotRequired[str]
    country_code: NotRequired[str]
    email: NotRequired[str]
    one_click: NotRequired[BlikOneClickPaymentObjectDict]
