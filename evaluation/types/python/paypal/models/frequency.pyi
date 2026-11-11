from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import SdkBaseModel
from .enums.interval_unit import IntervalUnitOrStr

class Frequency(SdkBaseModel):
    interval_unit: IntervalUnitOrStr
    interval_count: int = 1

class FrequencyDict(TypedDict):
    interval_unit: IntervalUnitOrStr
    interval_count: NotRequired[int]
