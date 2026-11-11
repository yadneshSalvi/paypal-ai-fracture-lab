from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel

class BlikOneClickPaymentObject(SdkBaseModel):
    consumer_reference: Optional[str] = UNSET

class BlikOneClickPaymentObjectDict(TypedDict):
    consumer_reference: NotRequired[str]
