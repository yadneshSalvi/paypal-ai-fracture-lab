from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel

class P24PaymentObject(SdkBaseModel):
    name: Optional[str] = UNSET
    email: Optional[str] = UNSET
    country_code: Optional[str] = UNSET
    payment_descriptor: Optional[str] = UNSET
    method_id: Optional[str] = UNSET
    method_description: Optional[str] = UNSET

class P24PaymentObjectDict(TypedDict):
    name: NotRequired[str]
    email: NotRequired[str]
    country_code: NotRequired[str]
    payment_descriptor: NotRequired[str]
    method_id: NotRequired[str]
    method_description: NotRequired[str]
