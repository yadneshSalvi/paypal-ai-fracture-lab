from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .address import Address, AddressDict
from .line_item import LineItem, LineItemDict
from .money import Money, MoneyDict

class Level3CardProcessingData(SdkBaseModel):
    shipping_amount: Optional[Money] = UNSET
    duty_amount: Optional[Money] = UNSET
    discount_amount: Optional[Money] = UNSET
    shipping_address: Optional[Address] = UNSET
    ships_from_postal_code: Optional[str] = UNSET
    line_items: Optional[list[LineItem]] = UNSET

class Level3CardProcessingDataDict(TypedDict):
    shipping_amount: NotRequired[MoneyDict]
    duty_amount: NotRequired[MoneyDict]
    discount_amount: NotRequired[MoneyDict]
    shipping_address: NotRequired[AddressDict]
    ships_from_postal_code: NotRequired[str]
    line_items: NotRequired[list[LineItemDict]]
