from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .enums.card_brand import CardBrandOrStr

class NetworkTransactionReferenceEntity(SdkBaseModel):
    id: str
    date: Optional[str] = UNSET
    network: Optional[CardBrandOrStr] = UNSET
    time: Optional[str] = UNSET

class NetworkTransactionReferenceEntityDict(TypedDict):
    id: str
    date: NotRequired[str]
    network: NotRequired[CardBrandOrStr]
    time: NotRequired[str]
