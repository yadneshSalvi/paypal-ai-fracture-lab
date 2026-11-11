from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel

class Phone(SdkBaseModel):
    country_code: str
    national_number: str
    extension_number: Optional[str] = UNSET

class PhoneDict(TypedDict):
    country_code: str
    national_number: str
    extension_number: NotRequired[str]
