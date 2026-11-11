from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .enums.dispute_category import DisputeCategoryOrStr
from .enums.seller_protection_status import SellerProtectionStatusOrStr

class SellerProtection(SdkBaseModel):
    status: Optional[SellerProtectionStatusOrStr] = UNSET
    dispute_categories: Optional[list[DisputeCategoryOrStr]] = UNSET

class SellerProtectionDict(TypedDict):
    status: NotRequired[SellerProtectionStatusOrStr]
    dispute_categories: NotRequired[list[DisputeCategoryOrStr]]
