from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .name import Name, NameDict
from .phone_with_type import PhoneWithType, PhoneWithTypeDict

class PayPalWalletCustomerRequest(SdkBaseModel):
    id: Optional[str] = UNSET
    email_address: Optional[str] = UNSET
    phone: Optional[PhoneWithType] = UNSET
    name: Optional[Name] = UNSET
    merchant_customer_id: Optional[str] = UNSET

class PayPalWalletCustomerRequestDict(TypedDict):
    id: NotRequired[str]
    email_address: NotRequired[str]
    phone: NotRequired[PhoneWithTypeDict]
    name: NotRequired[NameDict]
    merchant_customer_id: NotRequired[str]
