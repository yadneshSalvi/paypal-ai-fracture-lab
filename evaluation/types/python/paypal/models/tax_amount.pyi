from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .money import Money, MoneyDict

class TaxAmount(SdkBaseModel):
    tax_amount: Optional[Money] = UNSET

class TaxAmountDict(TypedDict):
    tax_amount: NotRequired[MoneyDict]
