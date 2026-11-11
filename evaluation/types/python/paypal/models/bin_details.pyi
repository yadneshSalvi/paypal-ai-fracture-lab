from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel

class BinDetails(SdkBaseModel):
    bin: Optional[str] = UNSET
    issuing_bank: Optional[str] = UNSET
    bin_country_code: Optional[str] = UNSET
    products: Optional[list[str]] = UNSET

class BinDetailsDict(TypedDict):
    bin: NotRequired[str]
    issuing_bank: NotRequired[str]
    bin_country_code: NotRequired[str]
    products: NotRequired[list[str]]
