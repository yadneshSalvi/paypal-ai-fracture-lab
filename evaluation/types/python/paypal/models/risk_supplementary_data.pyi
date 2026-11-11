from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .participant_metadata import ParticipantMetadata, ParticipantMetadataDict

class RiskSupplementaryData(SdkBaseModel):
    customer: Optional[ParticipantMetadata] = UNSET

class RiskSupplementaryDataDict(TypedDict):
    customer: NotRequired[ParticipantMetadataDict]
