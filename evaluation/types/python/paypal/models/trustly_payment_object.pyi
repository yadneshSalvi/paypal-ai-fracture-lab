from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel

class TrustlyPaymentObject(SdkBaseModel):
    name: Optional[str] = UNSET
    country_code: Optional[str] = UNSET
    email: Optional[str] = UNSET
    bic: Optional[str] = UNSET
    iban_last_chars: Optional[str] = UNSET

class TrustlyPaymentObjectDict(TypedDict):
    name: NotRequired[str]
    country_code: NotRequired[str]
    email: NotRequired[str]
    bic: NotRequired[str]
    iban_last_chars: NotRequired[str]
