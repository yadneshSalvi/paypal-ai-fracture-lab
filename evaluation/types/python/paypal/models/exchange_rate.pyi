from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel

class ExchangeRate(SdkBaseModel):
    source_currency: Optional[str] = UNSET
    target_currency: Optional[str] = UNSET
    value: Optional[str] = UNSET

class ExchangeRateDict(TypedDict):
    source_currency: NotRequired[str]
    target_currency: NotRequired[str]
    value: NotRequired[str]
