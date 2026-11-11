from __future__ import annotations
from typing_extensions import TypedDict
from ..core import SdkBaseModel

class PhoneNumberWithCountryCode(SdkBaseModel):
    country_code: str
    national_number: str

class PhoneNumberWithCountryCodeDict(TypedDict):
    country_code: str
    national_number: str
