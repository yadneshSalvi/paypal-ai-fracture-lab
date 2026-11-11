from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .enums.tenure_type import TenureTypeOrStr

class CycleExecution(SdkBaseModel):
    tenure_type: TenureTypeOrStr
    sequence: int
    cycles_completed: int
    cycles_remaining: Optional[int] = UNSET
    current_pricing_scheme_version: Optional[int] = UNSET
    total_cycles: Optional[int] = UNSET

class CycleExecutionDict(TypedDict):
    tenure_type: TenureTypeOrStr
    sequence: int
    cycles_completed: int
    cycles_remaining: NotRequired[int]
    current_pricing_scheme_version: NotRequired[int]
    total_cycles: NotRequired[int]
