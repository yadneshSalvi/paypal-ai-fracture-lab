from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .enums.card_brand import CardBrandOrStr

class NetworkTransaction(SdkBaseModel):
    id: Optional[str] = UNSET
    date: Optional[str] = UNSET
    network: Optional[CardBrandOrStr] = UNSET
    acquirer_reference_number: Optional[str] = UNSET

class NetworkTransactionDict(TypedDict):
    id: NotRequired[str]
    date: NotRequired[str]
    network: NotRequired[CardBrandOrStr]
    acquirer_reference_number: NotRequired[str]
