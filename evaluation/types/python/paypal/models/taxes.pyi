from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import SdkBaseModel

class Taxes(SdkBaseModel):
    percentage: str
    inclusive: bool = True

class TaxesDict(TypedDict):
    percentage: str
    inclusive: NotRequired[bool]
