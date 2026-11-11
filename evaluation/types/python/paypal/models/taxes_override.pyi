from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel

class TaxesOverride(SdkBaseModel):
    percentage: Optional[str] = UNSET
    inclusive: Optional[bool] = UNSET

class TaxesOverrideDict(TypedDict):
    percentage: NotRequired[str]
    inclusive: NotRequired[bool]
