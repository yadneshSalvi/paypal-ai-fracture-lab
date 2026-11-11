from __future__ import annotations
from pydantic import Field
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .address import Address, AddressDict
from .enums.card_brand import CardBrandOrStr
from .enums.card_type import CardTypeOrStr

class ApplePayTokenizedCard(SdkBaseModel):
    name: Optional[str] = UNSET
    number: Optional[str] = UNSET
    expiry: Optional[str] = UNSET
    card_type: Optional[CardBrandOrStr] = UNSET
    type_: Optional[CardTypeOrStr] = Field(default=UNSET, alias='type')
    brand: Optional[CardBrandOrStr] = UNSET
    billing_address: Optional[Address] = UNSET

class ApplePayTokenizedCardDict(TypedDict):
    name: NotRequired[str]
    number: NotRequired[str]
    expiry: NotRequired[str]
    card_type: NotRequired[CardBrandOrStr]
    type_: NotRequired[CardTypeOrStr]
    brand: NotRequired[CardBrandOrStr]
    billing_address: NotRequired[AddressDict]
