from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .item_details import ItemDetails, ItemDetailsDict

class CartInformation(SdkBaseModel):
    item_details: Optional[list[ItemDetails]] = UNSET
    tax_inclusive: bool = False
    paypal_invoice_id: Optional[str] = UNSET

class CartInformationDict(TypedDict):
    item_details: NotRequired[list[ItemDetailsDict]]
    tax_inclusive: NotRequired[bool]
    paypal_invoice_id: NotRequired[str]
