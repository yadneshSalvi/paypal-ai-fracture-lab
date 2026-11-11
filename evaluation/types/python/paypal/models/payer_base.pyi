from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel

class PayerBase(SdkBaseModel):
    email_address: Optional[str] = UNSET
    payer_id: Optional[str] = UNSET

class PayerBaseDict(TypedDict):
    email_address: NotRequired[str]
    payer_id: NotRequired[str]
