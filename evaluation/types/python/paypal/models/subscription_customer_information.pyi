from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .phone_with_type import PhoneWithType, PhoneWithTypeDict

class SubscriptionCustomerInformation(SdkBaseModel):
    id: Optional[str] = UNSET
    email_address: Optional[str] = UNSET
    phone: Optional[PhoneWithType] = UNSET

class SubscriptionCustomerInformationDict(TypedDict):
    id: NotRequired[str]
    email_address: NotRequired[str]
    phone: NotRequired[PhoneWithTypeDict]
