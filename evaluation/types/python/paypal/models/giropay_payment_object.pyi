from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel

class GiropayPaymentObject(SdkBaseModel):
    name: Optional[str] = UNSET
    country_code: Optional[str] = UNSET
    bic: Optional[str] = UNSET

class GiropayPaymentObjectDict(TypedDict):
    name: NotRequired[str]
    country_code: NotRequired[str]
    bic: NotRequired[str]
