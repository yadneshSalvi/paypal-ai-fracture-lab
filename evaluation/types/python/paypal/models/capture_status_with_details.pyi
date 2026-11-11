from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .capture_status_details import CaptureStatusDetails, CaptureStatusDetailsDict
from .enums.capture_status import CaptureStatusOrStr

class CaptureStatusWithDetails(SdkBaseModel):
    status: Optional[CaptureStatusOrStr] = UNSET
    status_details: Optional[CaptureStatusDetails] = UNSET

class CaptureStatusWithDetailsDict(TypedDict):
    status: NotRequired[CaptureStatusOrStr]
    status_details: NotRequired[CaptureStatusDetailsDict]
