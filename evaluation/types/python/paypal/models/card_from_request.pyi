from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel

class CardFromRequest(SdkBaseModel):
    expiry: Optional[str] = UNSET
    last_digits: Optional[str] = UNSET

class CardFromRequestDict(TypedDict):
    expiry: NotRequired[str]
    last_digits: NotRequired[str]
