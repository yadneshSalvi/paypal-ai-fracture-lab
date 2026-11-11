from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .universal_product_code import UniversalProductCode, UniversalProductCodeDict

class OrderTrackerItem(SdkBaseModel):
    name: Optional[str] = UNSET
    quantity: Optional[str] = UNSET
    sku: Optional[str] = UNSET
    url: Optional[str] = UNSET
    image_url: Optional[str] = UNSET
    upc: Optional[UniversalProductCode] = UNSET

class OrderTrackerItemDict(TypedDict):
    name: NotRequired[str]
    quantity: NotRequired[str]
    sku: NotRequired[str]
    url: NotRequired[str]
    image_url: NotRequired[str]
    upc: NotRequired[UniversalProductCodeDict]
