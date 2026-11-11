from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel

class PhoneNumberWithOptionalCountryCode(SdkBaseModel):
    country_code: Optional[str] = UNSET
    national_number: str

class PhoneNumberWithOptionalCountryCodeDict(TypedDict):
    country_code: NotRequired[str]
    national_number: str
