from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel

class BancontactPaymentObject(SdkBaseModel):
    name: Optional[str] = UNSET
    country_code: Optional[str] = UNSET
    bic: Optional[str] = UNSET
    iban_last_chars: Optional[str] = UNSET
    card_last_digits: Optional[str] = UNSET

class BancontactPaymentObjectDict(TypedDict):
    name: NotRequired[str]
    country_code: NotRequired[str]
    bic: NotRequired[str]
    iban_last_chars: NotRequired[str]
    card_last_digits: NotRequired[str]
