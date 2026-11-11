from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .address import Address, AddressDict
from .name import Name, NameDict
from .phone_with_type import PhoneWithType, PhoneWithTypeDict
from .tax_info import TaxInfo, TaxInfoDict

class Payer(SdkBaseModel):
    email_address: Optional[str] = UNSET
    payer_id: Optional[str] = UNSET
    name: Optional[Name] = UNSET
    phone: Optional[PhoneWithType] = UNSET
    birth_date: Optional[str] = UNSET
    tax_info: Optional[TaxInfo] = UNSET
    address: Optional[Address] = UNSET

class PayerDict(TypedDict):
    email_address: NotRequired[str]
    payer_id: NotRequired[str]
    name: NotRequired[NameDict]
    phone: NotRequired[PhoneWithTypeDict]
    birth_date: NotRequired[str]
    tax_info: NotRequired[TaxInfoDict]
    address: NotRequired[AddressDict]
