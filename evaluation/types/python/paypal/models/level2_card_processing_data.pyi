from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .money import Money, MoneyDict

class Level2CardProcessingData(SdkBaseModel):
    invoice_id: Optional[str] = UNSET
    tax_total: Optional[Money] = UNSET

class Level2CardProcessingDataDict(TypedDict):
    invoice_id: NotRequired[str]
    tax_total: NotRequired[MoneyDict]
