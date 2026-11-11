from __future__ import annotations
from typing import Any
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .card_verification_processor_response import CardVerificationProcessorResponse, CardVerificationProcessorResponseDict
from .enums.card_brand import CardBrandOrStr
from .money import Money, MoneyDict

class CardVerificationDetails(SdkBaseModel):
    network_transaction_id: Optional[str] = UNSET
    date: Optional[str] = UNSET
    network: Optional[CardBrandOrStr] = UNSET
    time: Optional[str] = UNSET
    amount: Optional[Money] = UNSET
    processor_response: Optional[CardVerificationProcessorResponse] = UNSET
    three_d_secure: Optional[Any] = UNSET

class CardVerificationDetailsDict(TypedDict):
    network_transaction_id: NotRequired[str]
    date: NotRequired[str]
    network: NotRequired[CardBrandOrStr]
    time: NotRequired[str]
    amount: NotRequired[MoneyDict]
    processor_response: NotRequired[CardVerificationProcessorResponseDict]
    three_d_secure: NotRequired[Any]
