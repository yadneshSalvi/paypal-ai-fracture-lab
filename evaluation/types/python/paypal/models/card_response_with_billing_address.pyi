from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .address import Address, AddressDict

class CardResponseWithBillingAddress(SdkBaseModel):
    name: Optional[str] = UNSET
    billing_address: Optional[Address] = UNSET
    expiry: Optional[str] = UNSET
    currency_code: Optional[str] = UNSET

class CardResponseWithBillingAddressDict(TypedDict):
    name: NotRequired[str]
    billing_address: NotRequired[AddressDict]
    expiry: NotRequired[str]
    currency_code: NotRequired[str]
