from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .name import Name, NameDict

class SubscriptionPayer(SdkBaseModel):
    email_address: Optional[str] = UNSET
    payer_id: Optional[str] = UNSET
    name: Optional[Name] = UNSET

class SubscriptionPayerDict(TypedDict):
    email_address: NotRequired[str]
    payer_id: NotRequired[str]
    name: NotRequired[NameDict]
