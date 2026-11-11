from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .address import Address, AddressDict
from .enums.card_brand import CardBrandOrStr

class PaymentTokenRequestCard(SdkBaseModel):
    name: Optional[str] = UNSET
    number: Optional[str] = UNSET
    expiry: Optional[str] = UNSET
    security_code: Optional[str] = UNSET
    brand: Optional[CardBrandOrStr] = UNSET
    billing_address: Optional[Address] = UNSET

class PaymentTokenRequestCardDict(TypedDict):
    name: NotRequired[str]
    number: NotRequired[str]
    expiry: NotRequired[str]
    security_code: NotRequired[str]
    brand: NotRequired[CardBrandOrStr]
    billing_address: NotRequired[AddressDict]
