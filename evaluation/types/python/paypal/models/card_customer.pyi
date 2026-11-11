from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .phone_with_type import PhoneWithType, PhoneWithTypeDict

class CardCustomer(SdkBaseModel):
    id: Optional[str] = UNSET
    email_address: Optional[str] = UNSET
    phone: Optional[PhoneWithType] = UNSET
    merchant_customer_id: Optional[str] = UNSET

class CardCustomerDict(TypedDict):
    id: NotRequired[str]
    email_address: NotRequired[str]
    phone: NotRequired[PhoneWithTypeDict]
    merchant_customer_id: NotRequired[str]
