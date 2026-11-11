from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .card_supplementary_data import CardSupplementaryData, CardSupplementaryDataDict
from .risk_supplementary_data import RiskSupplementaryData, RiskSupplementaryDataDict

class SupplementaryData(SdkBaseModel):
    card: Optional[CardSupplementaryData] = UNSET
    risk: Optional[RiskSupplementaryData] = UNSET

class SupplementaryDataDict(TypedDict):
    card: NotRequired[CardSupplementaryDataDict]
    risk: NotRequired[RiskSupplementaryDataDict]
