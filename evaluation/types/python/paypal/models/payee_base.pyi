from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel

class PayeeBase(SdkBaseModel):
    email_address: Optional[str] = UNSET
    merchant_id: Optional[str] = UNSET

class PayeeBaseDict(TypedDict):
    email_address: NotRequired[str]
    merchant_id: NotRequired[str]
