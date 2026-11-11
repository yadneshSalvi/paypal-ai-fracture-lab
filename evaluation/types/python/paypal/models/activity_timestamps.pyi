from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel

class ActivityTimestamps(SdkBaseModel):
    create_time: Optional[str] = UNSET
    update_time: Optional[str] = UNSET

class ActivityTimestampsDict(TypedDict):
    create_time: NotRequired[str]
    update_time: NotRequired[str]
