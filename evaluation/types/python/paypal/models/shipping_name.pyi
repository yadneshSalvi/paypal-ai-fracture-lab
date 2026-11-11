from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel

class ShippingName(SdkBaseModel):
    full_name: Optional[str] = UNSET

class ShippingNameDict(TypedDict):
    full_name: NotRequired[str]
