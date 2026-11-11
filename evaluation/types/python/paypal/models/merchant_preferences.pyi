from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel

class MerchantPreferences(SdkBaseModel):
    return_url: Optional[str] = UNSET
    cancel_url: Optional[str] = UNSET

class MerchantPreferencesDict(TypedDict):
    return_url: NotRequired[str]
    cancel_url: NotRequired[str]
