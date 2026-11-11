from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel

class ParticipantMetadata(SdkBaseModel):
    ip_address: Optional[str] = UNSET

class ParticipantMetadataDict(TypedDict):
    ip_address: NotRequired[str]
