from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .level2_card_processing_data import Level2CardProcessingData, Level2CardProcessingDataDict
from .level3_card_processing_data import Level3CardProcessingData, Level3CardProcessingDataDict

class CardSupplementaryData(SdkBaseModel):
    level_2: Optional[Level2CardProcessingData] = UNSET
    level_3: Optional[Level3CardProcessingData] = UNSET

class CardSupplementaryDataDict(TypedDict):
    level_2: NotRequired[Level2CardProcessingDataDict]
    level_3: NotRequired[Level3CardProcessingDataDict]
