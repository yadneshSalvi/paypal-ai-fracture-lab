from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .money import Money, MoneyDict
from .payee_base import PayeeBase, PayeeBaseDict

class CobrandedCard(SdkBaseModel):
    labels: Optional[list[str]] = UNSET
    payee: Optional[PayeeBase] = UNSET
    amount: Optional[Money] = UNSET

class CobrandedCardDict(TypedDict):
    labels: NotRequired[list[str]]
    payee: NotRequired[PayeeBaseDict]
    amount: NotRequired[MoneyDict]
