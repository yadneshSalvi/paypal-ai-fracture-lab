from __future__ import annotations
from pydantic import Field
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .address import Address, AddressDict
from .enums.card_brand import CardBrandOrStr
from .enums.card_type import CardTypeOrStr

class GooglePayCard(SdkBaseModel):
    name: Optional[str] = UNSET
    number: Optional[str] = UNSET
    expiry: Optional[str] = UNSET
    last_digits: Optional[str] = UNSET
    type_: Optional[CardTypeOrStr] = Field(default=UNSET, alias='type')
    brand: Optional[CardBrandOrStr] = UNSET
    billing_address: Optional[Address] = UNSET

class GooglePayCardDict(TypedDict):
    name: NotRequired[str]
    number: NotRequired[str]
    expiry: NotRequired[str]
    last_digits: NotRequired[str]
    type_: NotRequired[CardTypeOrStr]
    brand: NotRequired[CardBrandOrStr]
    billing_address: NotRequired[AddressDict]
