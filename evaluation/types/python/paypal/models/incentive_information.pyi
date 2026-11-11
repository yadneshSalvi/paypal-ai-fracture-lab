from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .incentive_details import IncentiveDetails, IncentiveDetailsDict

class IncentiveInformation(SdkBaseModel):
    incentive_details: Optional[list[IncentiveDetails]] = UNSET

class IncentiveInformationDict(TypedDict):
    incentive_details: NotRequired[list[IncentiveDetailsDict]]
