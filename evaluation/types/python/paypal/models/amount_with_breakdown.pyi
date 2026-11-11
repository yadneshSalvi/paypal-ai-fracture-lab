from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .amount_breakdown import AmountBreakdown, AmountBreakdownDict

class AmountWithBreakdown(SdkBaseModel):
    currency_code: str
    value: str
    breakdown: Optional[AmountBreakdown] = UNSET

class AmountWithBreakdownDict(TypedDict):
    currency_code: str
    value: str
    breakdown: NotRequired[AmountBreakdownDict]
