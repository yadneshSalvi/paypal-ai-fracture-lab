from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel

class RelatedIdentifiers(SdkBaseModel):
    order_id: Optional[str] = UNSET
    authorization_id: Optional[str] = UNSET
    capture_id: Optional[str] = UNSET

class RelatedIdentifiersDict(TypedDict):
    order_id: NotRequired[str]
    authorization_id: NotRequired[str]
    capture_id: NotRequired[str]
