from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .money import Money, MoneyDict

class IncentiveDetails(SdkBaseModel):
    incentive_type: Optional[str] = UNSET
    incentive_code: Optional[str] = UNSET
    incentive_amount: Optional[Money] = UNSET
    incentive_program_code: Optional[str] = UNSET

class IncentiveDetailsDict(TypedDict):
    incentive_type: NotRequired[str]
    incentive_code: NotRequired[str]
    incentive_amount: NotRequired[MoneyDict]
    incentive_program_code: NotRequired[str]
