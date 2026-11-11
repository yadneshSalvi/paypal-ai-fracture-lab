from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .enums.phone_type import PhoneTypeOrStr
from .phone_number import PhoneNumber, PhoneNumberDict

class PhoneWithType(SdkBaseModel):
    phone_type: Optional[PhoneTypeOrStr] = UNSET
    phone_number: PhoneNumber

class PhoneWithTypeDict(TypedDict):
    phone_type: NotRequired[PhoneTypeOrStr]
    phone_number: PhoneNumberDict
