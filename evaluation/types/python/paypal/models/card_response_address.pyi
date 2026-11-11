from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel

class CardResponseAddress(SdkBaseModel):
    address_line_1: Optional[str] = UNSET
    address_line_2: Optional[str] = UNSET
    admin_area_2: Optional[str] = UNSET
    admin_area_1: Optional[str] = UNSET
    postal_code: Optional[str] = UNSET
    country_code: str
    id: Optional[str] = UNSET

class CardResponseAddressDict(TypedDict):
    address_line_1: NotRequired[str]
    address_line_2: NotRequired[str]
    admin_area_2: NotRequired[str]
    admin_area_1: NotRequired[str]
    postal_code: NotRequired[str]
    country_code: str
    id: NotRequired[str]
