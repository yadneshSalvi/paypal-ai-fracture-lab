from __future__ import annotations
from pydantic import Field
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .address import Address, AddressDict
from .enums.card_brand import CardBrandOrStr
from .enums.card_type import CardTypeOrStr

class ApplePayRequestCard(SdkBaseModel):
    type_: Optional[CardTypeOrStr] = Field(default=UNSET, alias='type')
    brand: Optional[CardBrandOrStr] = UNSET
    billing_address: Optional[Address] = UNSET

class ApplePayRequestCardDict(TypedDict):
    type_: NotRequired[CardTypeOrStr]
    brand: NotRequired[CardBrandOrStr]
    billing_address: NotRequired[AddressDict]
