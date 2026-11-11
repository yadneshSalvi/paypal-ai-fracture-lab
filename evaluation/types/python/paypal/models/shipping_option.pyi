from __future__ import annotations
from pydantic import Field
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .enums.shipping_type import ShippingTypeOrStr
from .money import Money, MoneyDict

class ShippingOption(SdkBaseModel):
    id: str
    label: str
    type_: Optional[ShippingTypeOrStr] = Field(default=UNSET, alias='type')
    amount: Optional[Money] = UNSET
    selected: bool

class ShippingOptionDict(TypedDict):
    id: str
    label: str
    type_: NotRequired[ShippingTypeOrStr]
    amount: NotRequired[MoneyDict]
    selected: bool
