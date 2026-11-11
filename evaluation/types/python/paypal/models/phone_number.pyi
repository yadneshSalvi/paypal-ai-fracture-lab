from __future__ import annotations
from typing_extensions import TypedDict
from ..core import SdkBaseModel

class PhoneNumber(SdkBaseModel):
    national_number: str

class PhoneNumberDict(TypedDict):
    national_number: str
