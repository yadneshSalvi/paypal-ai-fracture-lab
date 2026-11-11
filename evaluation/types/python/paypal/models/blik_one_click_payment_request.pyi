from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel

class BlikOneClickPaymentRequest(SdkBaseModel):
    auth_code: Optional[str] = UNSET
    consumer_reference: str
    alias_label: Optional[str] = UNSET
    alias_key: Optional[str] = UNSET

class BlikOneClickPaymentRequestDict(TypedDict):
    auth_code: NotRequired[str]
    consumer_reference: str
    alias_label: NotRequired[str]
    alias_key: NotRequired[str]
